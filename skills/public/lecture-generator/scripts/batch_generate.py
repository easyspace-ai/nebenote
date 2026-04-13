#!/usr/bin/env python3
"""
批量课程生成脚本

支持从 JSON/CSV 文件读取主题列表，批量生成课程。

输入格式示例 (JSON):
[
  {
    "topic": "React Hooks 入门",
    "difficulty": "beginner",
    "format": "markdown"
  },
  {
    "topic": "Python 异步编程",
    "difficulty": "advanced",
    "format": "markdown"
  }
]

遵循 frontend-design 规范：
- 支持并发处理
- 提供进度显示
- 详细的错误处理和日志
"""

import os
import sys
import json
import csv
import argparse
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed

# 添加脚本目录到路径
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from config import OUTPUT_DIR, get_config
from utils import (
    ensure_dir, get_timestamp, console, print_success, print_error,
    print_warning, print_info, validate_topic, validate_difficulty, validate_format
)
from generate_lecture import (
    LectureConfig, generate_lecture_content, save_lecture
)


# ============================================================================
# 数据模型
# ============================================================================

@dataclass
class BatchTask:
    """批量任务"""
    topic: str
    difficulty: str = "intermediate"
    output_format: str = "markdown"
    template_path: Optional[Path] = None
    output_path: Optional[Path] = None

    def to_config(self) -> LectureConfig:
        """转换为 LectureConfig"""
        return LectureConfig(
            topic=self.topic,
            difficulty=self.difficulty,
            output_format=self.output_format,
            template_path=self.template_path,
            output_path=self.output_path,
            verbose=False,
            dry_run=False
        )


@dataclass
class BatchResult:
    """批量任务结果"""
    task: BatchTask
    success: bool
    output_path: Optional[Path] = None
    error_message: Optional[str] = None
    word_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "topic": self.task.topic,
            "difficulty": self.task.difficulty,
            "success": self.success,
            "output_path": str(self.output_path) if self.output_path else None,
            "error_message": self.error_message,
            "word_count": self.word_count
        }


# ============================================================================
# 输入解析
# ============================================================================

def load_tasks_from_json(file_path: Path) -> List[BatchTask]:
    """
    从 JSON 文件加载任务

    Args:
        file_path: JSON 文件路径

    Returns:
        List[BatchTask]: 任务列表
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("JSON 文件应包含一个数组")

    tasks = []
    for item in data:
        if not isinstance(item, dict):
            print_warning(f"跳过无效条目: {item}")
            continue

        topic = item.get("topic") or item.get("subject") or item.get("title")
        if not topic:
            print_warning(f"跳过无主题的条目: {item}")
            continue

        task = BatchTask(
            topic=topic,
            difficulty=item.get("difficulty", "intermediate"),
            output_format=item.get("format", "markdown")
        )

        # 验证参数
        valid, error = validate_topic(task.topic)
        if not valid:
            print_warning(f"主题无效 '{task.topic}': {error}")
            continue

        valid, error = validate_difficulty(task.difficulty)
        if not valid:
            print_warning(f"难度无效 '{task.difficulty}': {error}，使用默认值")
            task.difficulty = "intermediate"

        tasks.append(task)

    return tasks


def load_tasks_from_csv(file_path: Path) -> List[BatchTask]:
    """
    从 CSV 文件加载任务

    Args:
        file_path: CSV 文件路径

    Returns:
        List[BatchTask]: 任务列表
    """
    tasks = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            topic = row.get("topic") or row.get("subject") or row.get("title")
            if not topic:
                continue

            task = BatchTask(
                topic=topic,
                difficulty=row.get("difficulty", "intermediate"),
                output_format=row.get("format", "markdown")
            )

            tasks.append(task)

    return tasks


def load_tasks(input_file: Path) -> List[BatchTask]:
    """
    从文件加载任务（自动识别格式）

    Args:
        input_file: 输入文件路径

    Returns:
        List[BatchTask]: 任务列表
    """
    suffix = input_file.suffix.lower()

    if suffix == '.json':
        return load_tasks_from_json(input_file)
    elif suffix == '.csv':
        return load_tasks_from_csv(input_file)
    else:
        raise ValueError(f"不支持的文件格式: {suffix}（支持 .json 和 .csv）")


# ============================================================================
# 任务执行
# ============================================================================

def process_task(task: BatchTask, verbose: bool = False) -> BatchResult:
    """
    处理单个任务

    Args:
        task: 批量任务
        verbose: 是否显示详细信息

    Returns:
        BatchResult: 任务结果
    """
    try:
        # 创建配置
        config = task.to_config()

        # 生成内容
        from generate_lecture import generate_lecture_content, save_lecture, LectureContent

        lecture = generate_lecture_content(config)

        # 保存文件
        output_path = save_lecture(lecture, config.output_path, verbose=False)

        # 计算字数
        word_count = count_words(lecture.to_markdown())

        return BatchResult(
            task=task,
            success=True,
            output_path=output_path,
            word_count=word_count
        )

    except Exception as e:
        error_msg = str(e)
        if verbose:
            error_msg += f"\n{traceback.format_exc()}"

        return BatchResult(
            task=task,
            success=False,
            error_message=error_msg
        )


def run_batch(
    tasks: List[BatchTask],
    workers: int = 1,
    verbose: bool = False
) -> List[BatchResult]:
    """
    运行批量任务

    Args:
        tasks: 任务列表
        workers: 并发工作线程数
        verbose: 是否显示详细信息

    Returns:
        List[BatchResult]: 任务结果列表
    """
    results = []
    total = len(tasks)

    if workers > 1:
        # 并发执行
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(process_task, task, verbose): task
                for task in tasks
            }

            for i, future in enumerate(as_completed(futures), 1):
                result = future.result()
                results.append(result)

                if not verbose:
                    status = "✅" if result.success else "❌"
                    console.print(f"[{i}/{total}] {status} {result.task.topic}")
    else:
        # 串行执行
        for i, task in enumerate(tasks, 1):
            if verbose:
                console.print(f"\n[bold cyan]处理 [{i}/{total}]: {task.topic}[/]\n")
            else:
                console.print(f"[{i}/{total}] {task.topic}...", end=" ")

            result = process_task(task, verbose)
            results.append(result)

            if not verbose:
                status = "✅" if result.success else "❌"
                console.print(status)

    return results


def save_results(results: List[BatchResult], output_file: Path):
    """
    保存批量任务结果

    Args:
        results: 任务结果列表
        output_file: 输出文件路径
    """
    data = {
        "timestamp": datetime.now().isoformat(),
        "total": len(results),
        "success": sum(1 for r in results if r.success),
        "failed": sum(1 for r in results if not r.success),
        "results": [r.to_dict() for r in results]
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ============================================================================
# CLI 入口
# ============================================================================

def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(
        prog='batch_generate',
        description='批量生成课程',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 从 JSON 文件批量生成
  python3 batch_generate.py topics.json

  # 指定并发数
  python3 batch_generate.py topics.json --workers 4

  # 详细输出
  python3 batch_generate.py topics.json --verbose

  # 保存结果报告
  python3 batch_generate.py topics.json --output-report results.json
        """
    )

    parser.add_argument(
        'input_file',
        type=Path,
        help='输入文件（JSON 或 CSV 格式）'
    )

    parser.add_argument(
        '--workers', '-w',
        type=int,
        default=1,
        help='并发工作线程数 (默认: 1)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='显示详细信息'
    )

    parser.add_argument(
        '--output-report',
        type=Path,
        help='保存结果报告到文件'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='预览模式，不实际生成'
    )

    args = parser.parse_args()

    # 检查输入文件
    if not args.input_file.exists():
        print_error(f"输入文件不存在: {args.input_file}")
        return 1

    # 加载任务
    try:
        tasks = load_tasks(args.input_file)
    except Exception as e:
        print_error(f"加载任务失败: {e}")
        return 1

    if not tasks:
        print_warning("没有要处理的任务")
        return 0

    print_info(f"已加载 {len(tasks)} 个任务")

    # 预览模式
    if args.dry_run:
        print_info("预览模式 - 任务列表:")
        for i, task in enumerate(tasks, 1):
            console.print(f"  {i}. {task.topic} ({task.difficulty})")
        return 0

    # 执行批量生成
    try:
        results = run_batch(tasks, args.workers, args.verbose)
    except KeyboardInterrupt:
        print_warning("用户中断")
        return 130
    except Exception as e:
        print_error(f"批量生成失败: {e}")
        if args.verbose:
            traceback.print_exc()
        return 1

    # 汇总结果
    success_count = sum(1 for r in results if r.success)
    fail_count = len(results) - success_count

    console.print(f"\n{'=' * 60}")
    console.print(f"[bold]批量生成完成[/]")
    console.print(f"{'=' * 60}")
    console.print(f"总计: {len(results)} 个任务")
    console.print(f"[green]成功: {success_count}[/]")
    if fail_count > 0:
        console.print(f"[red]失败: {fail_count}[/]")

    # 显示失败详情
    if fail_count > 0:
        console.print(f"\n[bold red]失败任务详情:[/]")
        for result in results:
            if not result.success:
                console.print(f"  ❌ {result.task.topic}")
                console.print(f"     错误: {result.error_message[:100]}...")

    # 保存结果报告
    if args.output_report:
        from datetime import datetime

        report_data = {
            "timestamp": datetime.now().isoformat(),
            "total": len(results),
            "success": success_count,
            "failed": fail_count,
            "results": [
                {
                    "topic": r.task.topic,
                    "success": r.success,
                    "output_path": str(r.output_path) if r.output_path else None,
                    "error_message": r.error_message
                }
                for r in results
            ]
        }

        with open(args.output_report, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)

        console.print(f"\n[dim]结果报告已保存: {args.output_report}[/]")

    return 0 if fail_count == 0 else 1


if __name__ == '__main__':
    sys.exit(main())