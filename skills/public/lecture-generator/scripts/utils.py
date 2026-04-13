"""
工具函数集合

提供文件操作、路径处理、文本处理等通用工具函数，
遵循 frontend-design 的 Python 脚本规范。
"""

import os
import re
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
from dataclasses import dataclass

import yaml
from rich.console import Console
from rich.panel import Panel
from rich.text import Text


# ============================================================================
# 控制台输出
# ============================================================================

console = Console()


def print_success(message: str, title: str = "成功"):
    """打印成功消息"""
    panel = Panel(
        message,
        title=title,
        border_style="green",
        title_align="left"
    )
    console.print(panel)


def print_error(message: str, title: str = "错误"):
    """打印错误消息"""
    panel = Panel(
        message,
        title=title,
        border_style="red",
        title_align="left"
    )
    console.print(panel)


def print_warning(message: str, title: str = "警告"):
    """打印警告消息"""
    panel = Panel(
        message,
        title=title,
        border_style="yellow",
        title_align="left"
    )
    console.print(panel)


def print_info(message: str, title: str = "信息"):
    """打印信息消息"""
    panel = Panel(
        message,
        title=title,
        border_style="blue",
        title_align="left"
    )
    console.print(panel)


# ============================================================================
# 路径和文件操作
# ============================================================================

def ensure_dir(path: Union[str, Path]) -> Path:
    """
    确保目录存在，不存在则创建

    Args:
        path: 目录路径

    Returns:
        Path: 目录的 Path 对象
    """
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_timestamp() -> str:
    """获取当前时间戳，格式：YYYYMMDDHHMMSS"""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def slugify(text: str) -> str:
    """
    将文本转换为 URL 友好的 slug

    Args:
        text: 原始文本

    Returns:
        str: slug 格式的字符串
    """
    # 转换为小写
    text = text.lower()
    # 替换空格和特殊字符为连字符
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    # 去除首尾连字符
    return text.strip('-')


def generate_filename(topic: str, extension: str = ".md") -> str:
    """
    生成课程文件名

    Args:
        topic: 课程主题
        extension: 文件扩展名

    Returns:
        str: 文件名（不含路径）
    """
    timestamp = get_timestamp()
    topic_slug = slugify(topic)
    return f"{timestamp}_{topic_slug}{extension}"


# ============================================================================
# 文本处理
# ============================================================================

def truncate(text: str, length: int = 100, suffix: str = "...") -> str:
    """
    截断文本到指定长度

    Args:
        text: 原始文本
        length: 最大长度
        suffix: 截断后缀

    Returns:
        str: 截断后的文本
    """
    if len(text) <= length:
        return text
    return text[:length - len(suffix)].rstrip() + suffix


def count_words(text: str) -> int:
    """
    统计词数（支持中英文）

    Args:
        text: 文本内容

    Returns:
        int: 词数
    """
    # 移除 Markdown 标记
    text = re.sub(r'[#*`\[\]()]', ' ', text)
    # 分割成词
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def extract_headings(content: str) -> List[Tuple[int, str]]:
    """
    提取 Markdown 标题

    Args:
        content: Markdown 内容

    Returns:
        List[Tuple[int, str]]: [(层级, 标题文本), ...]
    """
    headings = []
    for line in content.split('\n'):
        match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if match:
            level = len(match.group(1))
            text = match.group(2).strip()
            headings.append((level, text))
    return headings


# ============================================================================
# 数据序列化
# ============================================================================

def load_yaml(path: Union[str, Path]) -> Dict[str, Any]:
    """
    加载 YAML 文件

    Args:
        path: 文件路径

    Returns:
        Dict: 解析后的数据

    Raises:
        FileNotFoundError: 文件不存在
        yaml.YAMLError: YAML 解析错误
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"YAML file not found: {path}")

    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f) or {}


def save_yaml(data: Dict[str, Any], path: Union[str, Path]) -> None:
    """
    保存数据到 YAML 文件

    Args:
        data: 要保存的数据
        path: 目标文件路径
    """
    path = Path(path)
    ensure_dir(path.parent)

    with open(path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False)


def load_json(path: Union[str, Path]) -> Dict[str, Any]:
    """
    加载 JSON 文件

    Args:
        path: 文件路径

    Returns:
        Dict: 解析后的数据
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {path}")

    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: Dict[str, Any], path: Union[str, Path], indent: int = 2) -> None:
    """
    保存数据到 JSON 文件

    Args:
        data: 要保存的数据
        path: 目标文件路径
        indent: 缩进空格数
    """
    path = Path(path)
    ensure_dir(path.parent)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)


# ============================================================================
# 哈希和缓存
# ============================================================================

def compute_hash(content: Union[str, bytes], algorithm: str = "md5") -> str:
    """
    计算内容的哈希值

    Args:
        content: 要哈希的内容
        algorithm: 哈希算法（md5, sha1, sha256）

    Returns:
        str: 十六进制哈希值
    """
    if isinstance(content, str):
        content = content.encode('utf-8')

    hash_obj = hashlib.new(algorithm)
    hash_obj.update(content)
    return hash_obj.hexdigest()


def get_content_fingerprint(topic: str, difficulty: str, format: str) -> str:
    """
    生成内容指纹，用于缓存

    Args:
        topic: 主题
        difficulty: 难度
        format: 格式

    Returns:
        str: 指纹字符串
    """
    content = f"{topic}:{difficulty}:{format}"
    return compute_hash(content, "md5")[:12]


# ============================================================================
# 验证函数
# ============================================================================

def validate_topic(topic: str) -> Tuple[bool, Optional[str]]:
    """
    验证主题是否有效

    Args:
        topic: 课程主题

    Returns:
        Tuple[bool, Optional[str]]: (是否有效, 错误信息)
    """
    if not topic or not topic.strip():
        return False, "主题不能为空"

    if len(topic) < 2:
        return False, "主题至少需要 2 个字符"

    if len(topic) > 200:
        return False, "主题不能超过 200 个字符"

    return True, None


def validate_difficulty(difficulty: str) -> Tuple[bool, Optional[str]]:
    """
    验证难度级别是否有效

    Args:
        difficulty: 难度级别

    Returns:
        Tuple[bool, Optional[str]]: (是否有效, 错误信息)
    """
    valid_levels = ["beginner", "intermediate", "advanced"]

    if difficulty not in valid_levels:
        return False, f"无效的难度级别: {difficulty}，必须是 {valid_levels} 之一"

    return True, None


def validate_format(format: str) -> Tuple[bool, Optional[str]]:
    """
    验证输出格式是否有效

    Args:
        format: 输出格式

    Returns:
        Tuple[bool, Optional[str]]: (是否有效, 错误信息)
    """
    valid_formats = ["markdown", "interactive", "slides"]

    if format not in valid_formats:
        return False, f"无效的格式: {format}，必须是 {valid_formats} 之一"

    return True, None


# ============================================================================
# 便捷函数
# ============================================================================

def get_skill_info() -> Dict[str, Any]:
    """获取技能信息"""
    return {
        "name": "Lecture Generator",
        "version": "2.0.0",
        "description": "将教学内容转化为高质量 Markdown 课程",
        "root_path": str(SKILL_ROOT),
        "output_path": str(OUTPUT_DIR),
    }


def print_skill_banner():
    """打印技能横幅"""
    banner = """
╔════════════════════════════════════════╗
║      📚 Lecture Generator v2.0.0      ║
║   将教学内容转化为高质量课程      ║
╚════════════════════════════════════════╝
"""
    console.print(banner, style="bold cyan")