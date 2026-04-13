---
name: lecture-generator
description: 将教学内容转换为符合高校教学规范的 HTML 演示文稿。当用户需要制作教学课件、学术汇报、知识可视化时使用。支持 RevealJS 动画、公式渲染、数据图表、交互式代码演示。
---

# Lecture Generator

将教学内容转化为高质量 HTML 演示文稿的 Claude Code 技能。

---

## 概述

本技能将教学内容转换为符合高校教学规范的 HTML 演示文稿，支持：

- **RevealJS 框架**: 专业的幻灯片展示效果
- **动画仿真**: 算法演示、流程动画
- **公式渲染**: LaTeX 数学公式支持
- **数据可视化**: Chart.js 图表集成
- **代码高亮**: 语法高亮和交互式代码演示

---

## 调用方式

```
/generate-lecture "<主题>" [--template=<模板>] [--output=<路径>]
```

### 参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `主题` | string | - | 演示文稿主题（必填） |
| `--template` | string | `default` | 模板风格：`default` / `academic` / `minimal` / `vibrant` |
| `--output` | string | `.assets/output/` | 输出文件路径 |

### 示例

```bash
# 基础用法
/generate-lecture "React Hooks 入门"

# 指定模板风格
/generate-lecture "Python 异步编程" --template=academic

# 指定输出路径
/generate-lecture "机器学习基础" --output=./my-lecture.html
```

---

## 工作流程

```mermaid
flowchart LR
    A[内容分析] --> B[结构设计]
    B --> C[视觉设计]
    C --> D[HTML生成]
    D --> E[输出交付]
```

### 1. 内容分析与结构化

- 分析教学内容，识别核心知识点
- 按"章-节-知识点"三级体系组织
- 识别需要公式、动画、图表的知识点

### 2. 视觉设计

**选择设计方向**（遵循 frontend-design 美学指南）：

- **Typography**: 选择独特的字体组合，避免使用 Inter/Roboto 等通用字体
- **Color & Theme**: 确定配色方案，使用 CSS 变量保持一致性
- **Motion**: 设计动画和微交互，使用 CSS 动画或 Motion 库
- **Spatial Composition**: 非对称布局、留白控制、视觉层次
- **Backgrounds & Details**: 渐变、纹理、阴影等氛围元素

### 3. HTML 生成

调用 `scripts/html-generator.py` 生成完整的 RevealJS HTML 文件：

```bash
python scripts/html-generator.py \
  --title "演示标题" \
  --author "作者信息" \
  --content '[...]' \
  --output output.html
```

### 4. 输出交付

- 保存到 `.assets/output/`
- 提供文件路径和使用说明
- 说明键盘快捷键（方向键、空格、ESC、F）

---

## 工具使用规范

### 文件操作

| 场景 | 推荐工具 | 说明 |
|------|----------|------|
| 读取模板 | `Read` | 使用模板文件路径 |
| 生成演示文稿 | `Write` | 输出到 `.assets/output/` |
| 调用生成脚本 | `Bash` | 运行 `html-generator.py` |

### Python 脚本

```bash
# 生成演示文稿
python3 scripts/html-generator.py \
  --title "演示标题" \
  --author "作者" \
  --content '[...幻灯片内容...]' \
  --output .assets/output/lecture.html
```

---

## 输出规范

### 目录结构

```
lecture-generator/
├── SKILL.md                      # 本文件
├── requirements.txt              # Python 依赖
├── .gitignore                    # Git 忽略规则
├── .cursorignore                 # Cursor 忽略规则
├── .cursorrules                  # 规则文件
├── .assets/                      # 资源目录
│   ├── README.md                 # 资源说明
│   └── output/                   # 生成输出
├── references/                   # 参考文档
│   ├── slide-structure.md        # 幻灯片结构规范
│   ├── animation-templates.md    # 动画模板
│   ├── chart-templates.md       # 图表模板
│   └── revealjs-guide.md         # RevealJS 指南
└── scripts/                      # 工具脚本
    └── html-generator.py         # HTML 生成脚本
```

### 输出文件格式

生成的演示文稿文件使用以下命名规范：

```
.assets/output/
{timestamp}_{topic_slug}.html
```

例如：
```
.assets/output/20250413_143052_react_hooks_ru_men.html
```

---

## 设计美学指南

### 设计方向选择

在创建演示文稿前，选择一个明确的设计方向：

- **极简主义**: 干净的排版、大量留白、单色或双色配色
- **大胆鲜艳**: 高对比度、饱和度色彩、动态布局
- **学术专业**: 经典字体、结构化布局、图表为主
- **未来科技**: 深色主题、霓虹色彩、几何形状
- **自然有机**: 大地色调、有机形状、纹理背景

### Typography

- 避免使用 Inter、Roboto、Arial 等通用字体
- 标题使用有特色的展示字体（Display Font）
- 正文使用易读的衬线或无衬线字体
- 建立清晰的字体层级（标题/副标题/正文/注释）

### Color & Theme

- 使用 CSS 变量定义配色方案
- 选择主色、辅色、强调色
- 确保文字与背景有足够的对比度
- 使用渐变色增加视觉层次

### Motion & Animation

- 页面切换使用平滑的过渡动画
- 要点使用渐进式显示（fragments）
- 图表使用动画展示数据变化
- 悬停状态添加微交互

### Spatial Composition

- 使用非对称布局创造视觉兴趣
- 控制留白，避免内容过于拥挤
- 建立清晰的视觉层次
- 使用网格系统保持对齐

---

## 资源索引

### 必要脚本

- **scripts/html-generator.py** - 生成完整的 RevealJS HTML 文件，支持公式、动画、图表

### 参考文档

- **references/slide-structure.md** - 幻灯片结构规范
- **references/animation-templates.md** - 动画模板和示例
- **references/chart-templates.md** - 图表模板和配置
- **references/revealjs-guide.md** - RevealJS 功能和配置指南

---

## 故障处理

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 生成的 HTML 无法打开 | 检查是否完整生成，尝试用浏览器直接打开文件 |
| 动画效果不显示 | 确认浏览器支持 CSS 动画，检查动画配置语法 |
| 公式无法渲染 | 确保 LaTeX 语法正确，检查 KaTeX 配置 |
| 图表不显示 | 验证 Chart.js 配置，检查数据格式 |

### 获取帮助

- 查看 [references/revealjs-guide.md](references/revealjs-guide.md) 了解 RevealJS 功能
- 参考 [references/animation-templates.md](references/animation-templates.md) 了解动画配置
- 查看 [references/chart-templates.md](references/chart-templates.md) 了解图表配置
- 检查脚本中的文档字符串获取 API 参考

---

## 版本

- **技能版本**: 2.0.0
- **最后更新**: 2025-04-13
- **兼容 Claude Code**: >= 0.35.0
