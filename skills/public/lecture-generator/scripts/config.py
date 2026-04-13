"""
Lecture Generator 配置管理

遵循 frontend-design 规范的配置模式：
- 使用 Pydantic 进行配置验证
- 支持环境变量覆盖
- 提供路径常量和模板配置
"""

import os
from pathlib import Path
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# 路径常量
# ============================================================================

# 技能根目录（从 scripts/ 向上两级）
SKILL_ROOT = Path(__file__).parent.parent

# 资源目录
ASSETS_DIR = SKILL_ROOT / ".assets"
OUTPUT_DIR = ASSETS_DIR / "output"
TEMPLATES_DIR = ASSETS_DIR / "templates"

# 参考文档目录
REFERENCES_DIR = SKILL_ROOT / "references"

# 模板文件路径（使用 references/ 下的模板）
TEMPLATE_PATH = REFERENCES_DIR / "template.md"
STYLE_GUIDE_PATH = REFERENCES_DIR / "lecture-style-guide.md"
PROMPTS_PATH = REFERENCES_DIR / "prompts.md"
EXAMPLES_PATH = REFERENCES_DIR / "examples.md"
CHECKLIST_PATH = REFERENCES_DIR / "checklist.md"


# ============================================================================
# 配置类
# ============================================================================

class DifficultyConfig(BaseModel):
    """难度级别配置"""
    name: str
    description: str
    min_sections: int = 3
    max_sections: int = 10
    code_examples_required: bool = True
    exercises_count: int = 3


class OutputConfig(BaseModel):
    """输出配置"""
    format: str = "markdown"
    encoding: str = "utf-8"
    line_ending: str = "\n"

    @field_validator("format")
    @classmethod
    def validate_format(cls, v):
        allowed = ["markdown", "interactive", "slides"]
        if v not in allowed:
            raise ValueError(f"format must be one of {allowed}")
        return v


class TemplateConfig(BaseModel):
    """模板配置"""
    template_path: Path = TEMPLATE_PATH
    style_guide_path: Path = STYLE_GUIDE_PATH
    prompts_path: Path = PROMPTS_PATH
    examples_path: Path = EXAMPLES_PATH

    @field_validator("template_path", "style_guide_path", "prompts_path")
    @classmethod
    def validate_path(cls, v):
        if not v.exists():
            raise ValueError(f"Path does not exist: {v}")
        return v


class AppConfig(BaseModel):
    """应用主配置"""

    # 版本信息
    version: str = "2.0.0"

    # 调试模式
    debug: bool = Field(default=False, env="LECTURE_DEBUG")

    # 输出配置
    output: OutputConfig = OutputConfig()

    # 模板配置
    template: TemplateConfig = TemplateConfig()

    # 难度级别定义
    difficulties: Dict[str, DifficultyConfig] = {
        "beginner": DifficultyConfig(
            name="入门级",
            description="适合初学者的基础内容",
            min_sections=3,
            max_sections=5,
            code_examples_required=True,
            exercises_count=3
        ),
        "intermediate": DifficultyConfig(
            name="中级",
            description="适合有一定基础的学习者",
            min_sections=5,
            max_sections=8,
            code_examples_required=True,
            exercises_count=4
        ),
        "advanced": DifficultyConfig(
            name="高级",
            description="适合进阶学习者和专业人士",
            min_sections=6,
            max_sections=10,
            code_examples_required=True,
            exercises_count=5
        )
    }

    # 目录配置
    @property
    def output_dir(self) -> Path:
        """输出目录"""
        return OUTPUT_DIR

    @property
    def templates_dir(self) -> Path:
        """模板目录"""
        return TEMPLATES_DIR

    def get_difficulty_config(self, level: str) -> DifficultyConfig:
        """获取难度配置"""
        if level not in self.difficulties:
            raise ValueError(f"Unknown difficulty level: {level}")
        return self.difficulties[level]


# ============================================================================
# 全局配置实例
# ============================================================================

def get_config() -> AppConfig:
    """获取应用配置实例"""
    return AppConfig()


# 便捷访问
config = get_config()