#!/usr/bin/env python3
"""
课程验证脚本

验证生成的课程文件是否符合规范：
- 结构完整性（必须包含的章节）
- 格式正确性（Markdown 语法）
- 内容质量（字数、代码示例数量）
- 风格一致性（符合风格指南）

遵循 frontend-design 规范：
- 使用 Rich 库提供美观的输出
- 返回适当的退出码（0=通过，1=失败）
- 支持批量验证
"""

import os
import sys
import argparse
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum

# 添加脚本目录到路径
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from config import SKILL_ROOT, REFERENCES_DIR, CHECKLIST_PATH
from utils import (
    console, print_success, print_error, print_warning, print_info,
    count_words, extract_headings
)


# ============================================================================
# 验证结果类型
# ============================================================================

class CheckStatus(Enum):
    """检查状态"""
    PASS = "通过"
    FAIL = "失败"
    WARNING = "警告"
    SKIP = "跳过"


@dataclass
class CheckResult:
    """单个检查结果"""
    name: str                    # 检查项名称
    status: CheckStatus         # 状态
    message: str                # 详细信息
    details: List[str] = field(default_factory=list)  # 详细列表

    @property
    def icon(self) -> str:
        """状态图标"""
        icons = {
            CheckStatus.PASS: "✅",
            CheckStatus.FAIL: "❌",
            CheckStatus.WARNING: "⚠️",
            CheckStatus.SKIP: "⏭️"
        }
        return icons.get(self.status, "❓")


@dataclass
class ValidationReport:
    """验证报告"""
    file_path: Path
    checks: List[CheckResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """是否全部通过"""
        return all(
            c.status in (CheckStatus.PASS, CheckStatus.SKIP)
            for c in self.checks
        )

    @property
    def pass_count(self) -> int:
        """通过数量"""
        return sum(1 for c in self.checks if c.status == CheckStatus.PASS)

    @property
    def fail_count(self) -> int:
        """失败数量"""
        return sum(1 for c in self.checks if c.status == CheckStatus.FAIL)

    @property
    def warning_count(self) -> int:
        """警告数量"""
        return sum(1 for c in self.checks if c.status == CheckStatus.WARNING)

    def print_report(self):
        """打印报告"""
        from rich.table import Table
        from rich.panel import Panel

        # 标题
        title = f"验证报告: {self.file_path.name}"
        console.print(f"\n[bold cyan]{'=' * 60}[/]")
        console.print(f"[bold cyan]{title}[/]")
        console.print(f"[bold cyan]{'=' * 60}[/]\n")

        # 检查结果表格
        table = Table(show_header=True, header_style="bold")
        table.add_column("状态", style="center", width=4)
        table.add_column("检查项", width=20)
        table.add_column("结果", width=40)

        for check in self.checks:
            status_color = {
                CheckStatus.PASS: "green",
                CheckStatus.FAIL: "red",
                CheckStatus.WARNING: "yellow",
                CheckStatus.SKIP: "dim"
            }.get(check.status, "white")

            table.add_row(
                f"[{status_color}]{check.icon}[/{status_color}]",
                check.name,
                check.message
            )

        console.print(table)

        # 汇总
        summary = (
            f"总计: {len(self.checks)} | "
            f"[green]通过: {self.pass_count}[/] | "
            f"[red]失败: {self.fail_count}[/] | "
            f"[yellow]警告: {self.warning_count}[/]"
        )

        result_icon = "✅" if self.passed else "❌"
        result_text = "通过" if self.passed else "未通过"
        result_color = "green" if self.passed else "red"

        console.print(f"\n{summary}")
        console.print(f"\n[bold {result_color}]{result_icon} 验证结果: {result_text}[/{result_color}]\n")


# ============================================================================
# 具体检查函数
# ============================================================================

def check_file_exists(file_path: Path) -> CheckResult:
    """检查文件是否存在"""
    if file_path.exists():
        return CheckResult(
            name="文件存在",
            status=CheckStatus.PASS,
            message=f"文件存在: {file_path}"
        )
    else:
        return CheckResult(
            name="文件存在",
            status=CheckStatus.FAIL,
            message=f"文件不存在: {file_path}"
        )


def check_markdown_syntax(content: str) -> CheckResult:
    """检查 Markdown 语法"""
    errors = []

    # 检查标题层级（不应跳级）
    headings = extract_headings(content)
    prev_level = 0
    for level, text in headings:
        if level > prev_level + 1:
            errors.append(f"标题层级跳级: H{prev_level} -> H{level} ('{text}')")
        prev_level = level

    # 检查代码块闭合
    code_block_pattern = r'```'
    code_blocks = re.findall(code_block_pattern, content)
    if len(code_blocks) % 2 != 0:
        errors.append("代码块未正确闭合（奇数个 ```）")

    # 检查空链接
    empty_links = re.findall(r'\[([^\]]*)\]\(\s*\)', content)
    if empty_links:
        errors.append(f"发现空链接: {len(empty_links)} 个")

    if errors:
        return CheckResult(
            name="Markdown 语法",
            status=CheckStatus.FAIL if len(errors) > 2 else CheckStatus.WARNING,
            message=f"发现 {len(errors)} 个问题",
            details=errors[:5]  # 最多显示 5 个
        )
    else:
        return CheckResult(
            name="Markdown 语法",
            status=CheckStatus.PASS,
            message="Markdown 语法正确"
        )


def check_required_sections(content: str) -> CheckResult:
    """检查必须包含的章节"""
    required_sections = {
        r'#\s+[^\n]*简介': "简介",
        r'##\s+目录|#\s+目录': "目录",
        r'#\s+[^\n]*总结': "总结",
    }

    missing = []
    for pattern, name in required_sections.items():
        if not re.search(pattern, content, re.IGNORECASE):
            missing.append(name)

    if missing:
        return CheckResult(
            name="必需章节",
            status=CheckStatus.FAIL,
            message=f"缺少必需章节: {', '.join(missing)}
        )
    else:
        return CheckResult(
            name="必需章节",
            status=CheckStatus.PASS,
            message="包含所有必需章节"
        )


def check_content_quality(content: str) -> CheckResult:
    """检查内容质量"""
    issues = []

    # 字数检查
    word_count = count_words(content)
    if word_count < 500:
        issues.append(f"内容过短（{word_count} 字，建议至少 500 字）")
    elif word_count > 10000:
        issues.append(f"内容过长（{word_count} 字，建议控制在 10000 字以内）")

    # 代码示例检查
    code_blocks = re.findall(r'```[\w]*\n(.*?)```', content, re.DOTALL)
    if len(code_blocks) < 2:
        issues.append(f"代码示例较少（{len(code_blocks)} 个，建议至少 2 个）")

    # 检查过长的段落
    paragraphs = content.split('\n\n')
    long_paragraphs = [p for p in paragraphs if len(p) > 800]
    if len(long_paragraphs) > 3:
        issues.append(f"存在 {len(long_paragraphs)} 个超长段落（建议分段）")

    # 检查 TODO/FIXME 标记
    todo_matches = re.findall(r'TODO|FIXME|XXX', content, re.IGNORECASE)
    if todo_matches:
        issues.append(f"发现 {len(todo_matches)} 个未完成标记")

    if issues:
        return CheckResult(
            name="内容质量",
            status=CheckStatus.WARNING,
            message=f"发现 {len(issues)} 个改进建议",
            details=issues[:5]
        )
    else:
        return CheckResult(
            name="内容质量",
            status=CheckStatus.PASS,
            message=f"内容质量良好（{word_count} 字，{len(code_blocks)} 个代码示例）"
        )


# ============================================================================
# 主验证函数
# ============================================================================

def validate_lecture_file(file_path: Path, verbose: bool = False) -> ValidationReport:
    """
    验证单个课程文件

    Args:
        file_path: 课程文件路径
        verbose: 是否显示详细信息

    Returns:
        ValidationReport: 验证报告
    """
    report = ValidationReport(file_path=file_path)

    # 1. 检查文件是否存在
    result = check_file_exists(file_path)
    report.checks.append(result)

    if result.status == CheckStatus.FAIL:
        # 文件不存在，跳过后续检查
        return report

    # 读取文件内容
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        report.checks.append(CheckResult(
            name="文件读取",
            status=CheckStatus.FAIL,
            message=f"无法读取文件: {e}"
        ))
        return report

    # 2. 检查 Markdown 语法
    report.checks.append(check_markdown_syntax(content))

    # 3. 检查必需章节
    report.checks.append(check_required_sections(content))

    # 4. 检查内容质量
    report.checks.append(check_content_quality(content))

    return report


def validate_batch(file_paths: List[Path], verbose: bool = False) -> List[ValidationReport]:
    """
    批量验证课程文件

    Args:
        file_paths: 课程文件路径列表
        verbose: 是否显示详细信息

    Returns:
        List[ValidationReport]: 验证报告列表
    """
    reports = []

    for file_path in file_paths:
        report = validate_lecture_file(file_path, verbose)
        reports.append(report)

        if verbose:
            report.print_report()

    return reports


# ============================================================================
# CLI 入口
# ============================================================================

def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(
        prog='validate_lecture',
        description='验证课程文件格式和内容',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 验证单个文件
  python3 validate_lecture.py .assets/output/20250413_xxx.md

  # 详细输出
  python3 validate_lecture.py .assets/output/20250413_xxx.md --verbose

  # 批量验证
  python3 validate_lecture.py .assets/output/*.md

  # 仅显示失败项
  python3 validate_lecture.py .assets/output/*.md --only-failures
        """
    )

    parser.add_argument(
        'files',
        nargs='+',
        help='要验证的课程文件路径'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='显示详细信息'
    )

    parser.add_argument(
        '--only-failures',
        action='store_true',
        help='仅显示失败的验证'
    )

    parser.add_argument(
        '--strict',
        action='store_true',
        help='严格模式（警告视为失败）'
    )

    args = parser.parse_args()

    # 收集文件路径
    file_paths = []
    for pattern in args.files:
        path = Path(pattern)
        if path.exists():
            file_paths.append(path)
        else:
            # 尝试作为 glob 模式
            import glob
            matches = glob.glob(pattern)
            file_paths.extend(Path(p) for p in matches)

    if not file_paths:
        print_error("未找到要验证的文件")
        return 1

    # 去重并保持顺序
    seen = set()
    unique_paths = []
    for p in file_paths:
        if p not in seen:
            seen.add(p)
            unique_paths.append(p)

    file_paths = unique_paths

    # 执行验证
    if args.verbose:
        print_info(f"开始验证 {len(file_paths)} 个文件...")

    all_passed = True
    total_failures = 0

    for i, file_path in enumerate(file_paths, 1):
        if args.verbose and len(file_paths) > 1:
            console.print(f"\n[dim]({i}/{len(file_paths)})[/] {file_path}")

        report = validate_lecture_file(file_path, args.verbose)

        # 判断是否通过
        if args.strict:
            passed = all(c.status == CheckStatus.PASS for c in report.checks)
        else:
            passed = report.passed

        if not passed:
            all_passed = False
            total_failures += report.fail_count

        # 显示结果
        if args.verbose:
            if args.only_failures and passed:
                continue
            report.print_report()
        else:
            # 简洁模式
            status_icon = "✅" if passed else "❌"
            console.print(f"{status_icon} {file_path.name}")

    # 最终汇总
    if len(file_paths) > 1:
        console.print(f"\n{'=' * 60}")
        if all_passed:
            print_success(f"所有 {len(file_paths)} 个文件验证通过")
        else:
            print_error(f"验证完成: {total_failures} 个问题需要修复")
        console.print(f"{'=' * 60}")

    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())