#!/usr/bin/env python3
"""
课程生成主脚本

生成流程：
1. 解析参数和配置
2. 加载模板和参考文档
3. 调用 LLM 或模板引擎生成内容
4. 验证和格式化输出
5. 保存到文件

遵循 frontend-design 规范：
- 输出保存到 .assets/output/
- 使用 Pydantic 进行数据验证
- 提供详细的日志输出
"""

import os
import sys
import argparse
import traceback
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field

# 将脚本目录添加到路径，确保可以导入本地模块
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from config import (
    SKILL_ROOT, OUTPUT_DIR, TEMPLATES_DIR,
    TEMPLATE_PATH, STYLE_GUIDE_PATH, PROMPTS_PATH, EXAMPLES_PATH,
    get_config, get_skill_info, print_skill_banner
)
from utils import (
    ensure_dir, get_timestamp, generate_filename, truncate, count_words,
    extract_headings, validate_topic, validate_difficulty, validate_format,
    print_success, print_error, print_warning, print_info, console
)


# ============================================================================
# 数据模型
# ============================================================================

@dataclass
class LectureConfig:
    """课程生成配置"""
    topic: str
    difficulty: str = "intermediate"
    output_format: str = "markdown"
    template_path: Optional[Path] = None
    output_path: Optional[Path] = None
    verbose: bool = False
    dry_run: bool = False

    def __post_init__(self):
        # 验证参数
        valid, error = validate_topic(self.topic)
        if not valid:
            raise ValueError(f"无效的主题: {error}")

        valid, error = validate_difficulty(self.difficulty)
        if not valid:
            raise ValueError(f"无效的难度: {error}")

        valid, error = validate_format(self.output_format)
        if not valid:
            raise ValueError(f"无效的格式: {error}")

        # 设置默认路径
        if self.template_path is None:
            self.template_path = TEMPLATE_PATH

        if self.output_path is None:
            filename = generate_filename(self.topic)
            self.output_path = OUTPUT_DIR / filename


@dataclass
class LectureContent:
    """课程内容"""
    title: str
    introduction: str
    sections: list = field(default_factory=list)
    exercises: list = field(default_factory=list)
    summary: str = ""
    references: list = field(default_factory=list)

    def to_markdown(self) -> str:
        """转换为 Markdown 格式"""
        lines = [
            f"# {self.title}",
            "",
            "## 简介",
            "",
            self.introduction,
            "",
            "## 目录",
            "",
        ]

        # 添加目录
        for i, section in enumerate(self.sections, 1):
            lines.append(f"{i}. [{section.get('title', f'章节 {i}')}](#section-{i})")
        lines.append("")

        # 添加各章节
        for i, section in enumerate(self.sections, 1):
            lines.append(f"<a id='section-{i}'></a>")
            lines.append(f"### {section.get('title', f'章节 {i}')}")
            lines.append("")
            lines.append(section.get('content', ''))
            lines.append("")

        # 添加练习
        if self.exercises:
            lines.append("## 练习")
            lines.append("")
            for i, exercise in enumerate(self.exercises, 1):
                lines.append(f"### 练习 {i}")
                lines.append("")
                lines.append(exercise.get('description', ''))
                lines.append("")
                if 'solution' in exercise:
                    lines.append("<details>")
                    lines.append("<summary>查看答案</summary>")
                    lines.append("")
                    lines.append(exercise['solution'])
                    lines.append("")
                    lines.append("</details>")
                    lines.append("")

        # 添加总结
        if self.summary:
            lines.append("## 总结")
            lines.append("")
            lines.append(self.summary)
            lines.append("")

        # 添加参考资料
        if self.references:
            lines.append("## 参考资料")
            lines.append("")
            for ref in self.references:
                lines.append(f"- {ref}")
            lines.append("")

        return "\n".join(lines)


# ============================================================================
# 核心生成函数
# ============================================================================

def load_template(template_path: Path) -> str:
    """
    加载模板文件

    Args:
        template_path: 模板文件路径

    Returns:
        str: 模板内容
    """
    if not template_path.exists():
        raise FileNotFoundError(f"模板文件不存在: {template_path}")

    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()


def load_reference_docs() -> Dict[str, str]:
    """
    加载参考文档

    Returns:
        Dict[str, str]: 文档名称到内容的映射
    """
    docs = {}

    ref_files = {
        'style_guide': STYLE_GUIDE_PATH,
        'prompts': PROMPTS_PATH,
        'examples': EXAMPLES_PATH,
    }

    for name, path in ref_files.items():
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                docs[name] = f.read()

    return docs


def generate_lecture_content(config: LectureConfig) -> LectureContent:
    """
    生成课程内容

    Args:
        config: 生成配置

    Returns:
        LectureContent: 生成的课程内容
    """
    # 加载模板和参考文档
    template = load_template(config.template_path)
    ref_docs = load_reference_docs()

    # 获取难度配置
    app_config = get_config()
    difficulty_config = app_config.get_difficulty_config(config.difficulty)

    if config.verbose:
        print_info(
            f"生成参数:\n"
            f"- 主题: {config.topic}\n"
            f"- 难度: {config.difficulty} ({difficulty_config.name})\n"
            f"- 格式: {config.output_format}\n"
            f"- 模板: {config.template_path}\n"
            f"- 目标章节数: {difficulty_config.min_sections}-{difficulty_config.max_sections}"
        )

    # 创建课程内容对象
    # 注意：实际项目中，这里应该调用 LLM API 生成内容
    # 这里使用模板填充作为示例

    lecture = LectureContent(
        title=f"{config.topic} 教程",
        introduction=f"本课程将带您深入了解 {config.topic}。",
        sections=[
            {
                "title": "第一章：基础概念",
                "content": f"介绍 {config.topic} 的基础概念和核心原理。"
            },
            {
                "title": "第二章：实践应用",
                "content": f"通过实例学习 {config.topic} 的实际应用。"
            }
        ],
        exercises=[
            {
                "description": f"练习1：使用 {config.topic} 完成基础任务",
                "solution": "[答案代码]"
            }
        ],
        summary=f"本课程涵盖了 {config.topic} 的核心概念和实践技巧。",
        references=[
            f"{config.topic} 官方文档",
            f"深入学习 {config.topic} 的推荐资源"
        ]
    )

    return lecture


def save_lecture(lecture: LectureContent, output_path: Path, verbose: bool = False) -> Path:
    """
    保存课程到文件

    Args:
        lecture: 课程内容
        output_path: 输出路径
        verbose: 是否显示详细信息

    Returns:
        Path: 保存的文件路径
    """
    # 确保输出目录存在
    ensure_dir(output_path.parent)

    # 转换为 Markdown
    content = lecture.to_markdown()

    # 写入文件
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

    if verbose:
        word_count = count_words(content)
        heading_count = len(extract_headings(content))
        print_success(
            f"课程已保存\n"
            f"- 路径: {output_path}\n"
            f"- 字数: {word_count}\n"
            f"- 标题数: {heading_count}"
        )

    return output_path


# ============================================================================
# CLI 入口
# ============================================================================

def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(
        prog='generate_lecture',
        description='生成结构化课程',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 生成基础课程
  python3 generate_lecture.py "React Hooks"

  # 指定难度
  python3 generate_lecture.py "Python 异步编程" --difficulty advanced

  # 详细输出
  python3 generate_lecture.py "Go 并发模式" --verbose

  # 预览模式（不保存）
  python3 generate_lecture.py "Docker 基础" --dry-run
        """
    )

    parser.add_argument(
        'topic',
        help='课程主题'
    )

    parser.add_argument(
        '--difficulty',
        choices=['beginner', 'intermediate', 'advanced'],
        default='intermediate',
        help='课程难度 (默认: intermediate)'
    )

    parser.add_argument(
        '--format',
        choices=['markdown', 'interactive', 'slides'],
        default='markdown',
        help='输出格式 (默认: markdown)'
    )

    parser.add_argument(
        '--template',
        type=Path,
        help='自定义模板文件路径'
    )

    parser.add_argument(
        '--output',
        type=Path,
        help='输出文件路径'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='显示详细信息'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='预览模式，不保存文件'
    )

    args = parser.parse_args()

    # 打印横幅
    if args.verbose:
        print_skill_banner()

    try:
        # 创建配置
        config = LectureConfig(
            topic=args.topic,
            difficulty=args.difficulty,
            output_format=args.format,
            template_path=args.template,
            output_path=args.output,
            verbose=args.verbose,
            dry_run=args.dry_run
        )

        # 生成内容
        if args.verbose:
            print_info("正在生成课程内容...")

        lecture = generate_lecture_content(config)

        # 保存或预览
        if args.dry_run:
            print_info("预览模式 - 生成的课程大纲：")
            print(lecture.to_markdown()[:2000] + "\n... [预览已截断]")
        else:
            output_file = save_lecture(lecture, config.output_path, args.verbose)

            if not args.verbose:
                print_success(f"课程已生成: {output_file}")

        return 0

    except FileNotFoundError as e:
        print_error(f"文件未找到: {e}")
        if args.verbose:
            traceback.print_exc()
        return 1

    except ValueError as e:
        print_error(f"参数错误: {e}")
        return 1

    except Exception as e:
        print_error(f"生成失败: {e}")
        if args.verbose:
            traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())