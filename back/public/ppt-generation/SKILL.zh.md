---
name: ppt-generation
description: 当用户请求生成、创建或制作演示文稿（PPT/PPTX）时使用此技能。通过为每张幻灯片生成图像并将其组合成 PowerPoint 文件来创建视觉效果丰富的幻灯片。
---

# PPT 生成技能

## 概述

本技能通过为每张幻灯片创建 AI 生成的图像并将其组合成 PPTX 文件来生成专业 PowerPoint 演示文稿。工作流程包括：用一致的视觉风格规划演示文稿结构、按顺序生成幻灯片图像（使用前一张幻灯片作为参考以保持风格一致性）、以及将它们组装成最终演示文稿。

## 核心能力

- 规划和结构化具有统一视觉风格的多幻灯片演示文稿
- 支持多种演示风格：商务、学术、极简、Apple Keynote、创意
- 使用 image-generation 技能为每张幻灯片生成独特的 AI 图像
- 通过使用前一张幻灯片作为参考图像来保持视觉一致性
- 将图像组合成专业 PPTX 文件

## 演示风格

创建演示计划时选择以下风格之一：

| 风格 | 描述 | 最佳用途 |
|-------|-------------|----------|
| **glassmorphism** | 带模糊效果的磨砂玻璃面板、浮动半透明卡片、充满活力的渐变背景、通过分层创造深度 | 科技产品、AI/SaaS 演示、未来感演示 |
| **dark-premium** | 丰富的黑色背景 (#0a0a0a)、发光强调色、微妙的发光效果、奢侈品美学 | 高端产品、高管演示、高端品牌 |
| **gradient-modern** | 大胆的网格渐变、流畅的色彩过渡、当代排版、充满活力又精致 | 初创公司、创意机构、品牌发布 |
| **neo-brutalist** | 原始大胆的排版、高对比度、刻意的"丑"美学、反设计即设计、Memphis 风格 | 前沿品牌、Z世代定位、颠覆性初创 |
| **3d-isometric** | 干净的等距插图、浮动 3D 元素、柔和阴影、科技感美学 | 科技解释器、产品功能、SaaS 演示 |
| **editorial** | 杂志级布局、精致的排版层次、戏剧性摄影、Vogue/Bloomberg 美学 | 年报、奢侈品牌、思想领导 |
| **minimal-swiss** | 基于网格的精确、Helvetica 启发的排版、大胆使用负空间、永恒的现代主义 | 建筑、设计公司、高端咨询 |
| **keynote** | Apple 启发的美学、大胆排版、戏剧性图像、高对比度、电影感 | 主题演讲、产品发布、励志演讲 |

## 工作流程

### 步骤 1：理解需求

当用户请求演示文稿生成时，识别：

- 主题：演示文稿关于什么
- 幻灯片数量：需要多少张幻灯片（默认：5-10）
- **风格**：商务/学术/极简/keynote/创意
- 宽高比：标准（16:9）或经典（4:3）
- 内容大纲：每张幻灯片的关键点
- 不需要检查 `/mnt/user-data` 下的文件夹

### 步骤 2：创建演示计划

在 `/mnt/user-data/workspace/` 中创建 JSON 文件，包含演示文稿结构。**重要**：包含 `style` 字段以定义整体视觉一致性。

```json
{
  "title": "演示文稿标题",
  "style": "keynote",
  "style_guidelines": {
    "color_palette": "深黑背景、白色文本、单一强调色（蓝色或橙色）",
    "typography": "大胆的无衬线标题、干净的正文字体、戏剧性的尺寸对比",
    "imagery": "高质量摄影、整页图像、电影构图",
    "layout": "大量留白、居中焦点、每张幻灯片最少元素"
  },
  "aspect_ratio": "16:9",
  "slides": [
    {
      "slide_number": 1,
      "type": "title",
      "title": "主标题",
      "subtitle": "副标题或标语",
      "visual_description": "用于图像生成的详细描述"
    },
    {
      "slide_number": 2,
      "type": "content",
      "title": "幻灯片标题",
      "key_points": ["要点1", "要点2", "要点3"],
      "visual_description": "用于图像生成的详细描述"
    }
  ]
}
```

### 步骤 3：按顺序生成幻灯片图像

**重要**：**严格按顺序一张一张地生成幻灯片**。不要并行化或批量生成图像。每张幻灯片都依赖前一张幻灯片的输出作为参考图像。并行生成幻灯片会破坏视觉一致性，不允许。

1. 阅读 image-generation 技能：`/mnt/skills/public/image-generation/SKILL.md`

2. **对于第一张幻灯片（第1张）**，创建建立视觉风格的提示：

```json
{
  "prompt": "专业演示幻灯片。[来自计划的 style_guidelines]。标题：'你的标题'。[视觉描述]。此幻灯片为整个演示文稿建立视觉语言。",
  "style": "[基于所选风格 - 例如 Apple Keynote 美学、戏剧性光线、电影感]",
  "composition": "清晰的文本层次布局，[风格特定构图]",
  "color_palette": "[来自 style_guidelines]",
  "typography": "[来自 style_guidelines]"
}
```

```bash
python /mnt/skills/public/image-generation/scripts/generate.py \
  --prompt-file /mnt/user-data/workspace/slide-01-prompt.json \
  --output-file /mnt/user-data/outputs/slide-01.jpg \
  --aspect-ratio 16:9
```

3. **对于后续幻灯片（第2张+）**，使用前一张幻灯片作为参考图像：

```json
{
  "prompt": "专业演示幻灯片，延续参考图像的精确视觉风格。保持相同的调色板、排版风格和整体美学。标题：'幻灯片标题'。[视觉描述]。保持与参考的视觉一致性。",
  "style": "精确匹配参考图像的风格",
  "composition": "与参考相似的布局原则，为此内容改编",
  "color_palette": "与参考图像相同",
  "consistency_note": "此幻灯片必须看起来属于与参考图像相同的演示文稿"
}
```

```bash
python /mnt/skills/public/image-generation/scripts/generate.py \
  --prompt-file /mnt/user-data/workspace/slide-02-prompt.json \
  --reference-images /mnt/user-data/outputs/slide-01.jpg \
  --output-file /mnt/user-data/outputs/slide-02.jpg \
  --aspect-ratio 16:9
```

4. **为所有剩余幻灯片继续**，始终参考前一张幻灯片：

```bash
# 第3张引用第2张
python /mnt/skills/public/image-generation/scripts/generate.py \
  --prompt-file /mnt/user-data/workspace/slide-03-prompt.json \
  --reference-images /mnt/user-data/outputs/slide-02.jpg \
  --output-file /mnt/user-data/outputs/slide-03.jpg \
  --aspect-ratio 16:9

# 第4张引用第3张
python /mnt/skills/public/image-generation/scripts/generate.py \
  --prompt-file /mnt/user-data/workspace/slide-04-prompt.json \
  --reference-images /mnt/user-data/outputs/slide-03.jpg \
  --output-file /mnt/user-data/outputs/slide-04.jpg \
  --aspect-ratio 16:9
```

### 步骤 4：组合 PPT

所有幻灯片图像生成后，调用组合脚本：

```bash
python /mnt/skills/public/ppt-generation/scripts/generate.py \
  --plan-file /mnt/user-data/workspace/presentation-plan.json \
  --slide-images /mnt/user-data/outputs/slide-01.jpg /mnt/user-data/outputs/slide-02.jpg /mnt/user-data/outputs/slide-03.jpg \
  --output-file /mnt/user-data/outputs/presentation.pptx
```

参数：

- `--plan-file`：演示计划 JSON 文件的绝对路径（必填）
- `--slide-images`：按顺序排列的幻灯片图像的绝对路径（必填，空格分隔）
- `--output-file`：输出 PPTX 文件的绝对路径（必填）

[!NOTE]
不要读取 python 文件，只需用参数调用它。

## 完整示例：玻璃态风格（最现代前卫）

用户请求："创建关于 AI 产品发布的演示文稿"

### 步骤 1：创建演示计划

创建 `/mnt/user-data/workspace/ai-product-plan.json`：
```json
{
  "title": "Nova AI 正式发布",
  "style": "glassmorphism",
  "style_guidelines": {
    "color_palette": "充满活力的紫色到青色渐变背景 (#667eea→#00d4ff)、带 15-20% 白色不透明度的磨砂玻璃面板、电力强调色",
    "typography": "SF Pro Display 风格、大胆 700 重量白色标题带微妙文字阴影、干净的 400 重量正文字体、玻璃上极佳对比度",
    "imagery": "抽象 3D 玻璃球、浮动半透明几何形状、柔和发光球体、通过分层透明度创造深度",
    "layout": "居中的磨砂玻璃卡片，带 32px 圆角、48-64px 内边距、浮动于渐变之上、柔和阴影分层深度",
    "effects": "玻璃面板上 20-40px 背景模糊、微妙的白色边框发光、与渐变匹配的柔和彩色阴影、光折射效果",
    "visual_language": "Apple Vision Pro / visionOS 美学、通过透明度的高级深度、未来感但平易近人、2024 设计趋势"
  },
  "aspect_ratio": "16:9",
  "slides": [
    {
      "slide_number": 1,
      "type": "title",
      "title": "Nova AI 正式发布",
      "subtitle": "智能，再想象",
      "visual_description": "令人惊叹的渐变背景，从深紫色 (#667eea) 流过品红到青色 (#00d4ff)。中心：大磨砂玻璃面板，带强烈背景模糊效果，包含大胆白色标题 'Nova AI 正式发布' 和较浅副标题。卡片周围浮动 3D 玻璃球和抽象形状，创造深度。玻璃面板后面发出柔和发光。高级 visionOS 美学。玻璃卡片有微妙白色边框 (1px rgba 255,255,255,0.3) 和柔和紫色调阴影。"
    },
    {
      "slide_number": 2,
      "type": "content",
      "title": "为什么选择 Nova？",
      "key_points": ["10倍更快处理", "类人理解力", "企业级安全性"],
      "visual_description": "与前一张幻灯片相同的紫色-青色渐变背景。左侧：浮动磨砂玻璃卡片，带白色粗体标题'为什么选择 Nova？'，三个关键点位于下方，带微妙玻璃药丸徽章。右侧：抽象 3D 神经网络可视化，由互联玻璃节点与柔和青色发光组成，漂浮在空间中。浮动半透明几何形状（菱形、圆环）增加深度。与前一张幻灯片一致的玻璃态美学。"
    },
    {
      "slide_number": 3,
      "type": "content",
      "title": "工作原理",
      "key_points": ["自然语言输入", "多模态处理", "即时洞察"],
      "visual_description": "与前一张幻灯片一致的渐变背景。中央构图：三张堆叠的磨砂玻璃卡片，略有角度，显示工作流程步骤，由柔和发光线条连接。每张卡片有一个抽象图标。顶部有白色粗体标题'工作原理'。通过卡片分层和透明度创造深度。"
    },
    {
      "slide_number": 4,
      "type": "content",
      "title": "为规模而生",
      "key_points": ["1M+ 并发用户", "99.99% 运行时间", "全球基础设施"],
      "visual_description": "与前一张幻灯片相同的渐变背景。不对称布局：右侧是大磨砂玻璃面板，用粗体排版显示指标。左侧：抽象 3D 地球，由玻璃面板和连接线制成，代表全球规模。浮动数据可视化元素作为带数字的小玻璃卡片。整体有柔和的环境发光。高级科技美学。"
    },
    {
      "slide_number": 5,
      "type": "conclusion",
      "title": "未来从现在开始",
      "subtitle": "加入候补名单",
      "visual_description": "戏剧性终章幻灯片。渐变背景，活力略有增加。中央磨砂玻璃卡片，带大胆标题'未来从现在开始'和行动号召副标题。卡片后面：柔和光线和浮动玻璃粒子爆发，创造庆祝效果。多层玻璃形状创造深度。在保持风格一致性的同时，这是视觉上最有冲击力的幻灯片。"
    }
  ]
}
```

### 步骤 2：阅读 image-generation 技能

阅读 `/mnt/skills/public/image-generation/SKILL.md` 了解如何生成图像。

### 步骤 3：使用参考链接按顺序生成幻灯片图像

**第1张幻灯片 - 标题（建立视觉语言）：**

创建 `/mnt/user-data/workspace/nova-slide-01.json`：
```json
{
  "prompt": "超高级演示标题幻灯片，玻璃态设计。背景：流畅渐变，从深紫色 (#667eea) 经品红 (#f093fb) 到青色 (#00d4ff)，柔和而充满活力。中央：大磨砂玻璃面板，带强烈背景模糊效果，32px 圆角，包含大胆白色无衬线标题 'Nova AI 正式发布'（72pt，SF Pro Display 风格，font-weight 700）带微妙文字阴影，副标题在下方较轻重量。玻璃面板有微妙白色边框 (1px rgba 255,255,255,0.25) 和柔和紫色调投影。卡片周围浮动：带折射的 3D 玻璃球、半透明几何形状（菱形、抽象斑点），创造深度和维度。玻璃面板后面发出柔和发光小球体。微小浮动光粒子。Apple Vision Pro / visionOS UI 美学。专业演示幻灯片，16:9 宽高比。超现代、高级科技产品发布感觉。",
  "style": "玻璃态、visionOS 美学、Apple Vision Pro UI 风格、高级科技、2024 设计趋势",
  "composition": "居中玻璃卡片作为焦点，浮动 3D 元素在边缘创造深度，40% 负空间，清晰的视觉层次",
  "lighting": "来自渐变的柔和环境发光、光元素的折射、3D 形状上的微妙边缘照明",
  "color_palette": "紫色渐变 #667eea、品红 #f093fb、青色 #00d4ff、磨砂白 rgba(255,255,255,0.15)、纯白文本 #ffffff",
  "effects": "玻璃面板上的背景模糊、柔和彩色投影带颜色色调、光折射、玻璃上的微妙噪点纹理、浮动粒子"
}
```

```bash
python /mnt/skills/public/image-generation/scripts/generate.py \
  --prompt-file /mnt/user-data/workspace/nova-slide-01.json \
  --output-file /mnt/user-data/outputs/nova-slide-01.jpg \
  --aspect-ratio 16:9
```

**第2张幻灯片 - 内容（必须引用第1张以保持一致性）：**

创建 `/mnt/user-data/workspace/nova-slide-02.json`：
```json
{
  "prompt": "演示幻灯片，延续参考图像的精确视觉风格。相同的紫色到青色渐变背景、相同的玻璃态美学、相同的排版风格。左侧：磨砂玻璃卡片，带背景模糊，包含白色粗体标题'为什么选择 Nova？'（匹配参考字体样式），三个功能点在下方作为微妙玻璃药丸徽章。右侧：抽象 3D 神经网络可视化，由互联玻璃节点与柔和青色发光组成，漂浮在空间中。浮动半透明几何形状（与参考样式匹配）增加深度。磨砂玻璃有相同处理：白色边框、紫色调阴影、相同模糊强度。关键：此幻灯片必须看起来属于与参考图像完全相同的演示文稿 - 相同颜色、相同玻璃处理、相同整体美学。",
  "style": "精确匹配参考 - 玻璃态、visionOS 美学、相同视觉语言",
  "composition": "非对称分割：玻璃卡片左（40%），3D 可视化右（40%），元素间呼吸空间",
  "color_palette": "精确匹配参考：紫色 #667eea、青色 #00d4ff 渐变、相同磨砂白处理、相同白色文本",
  "consistency_note": "关键：必须与参考图像在风格上视觉上完全相同。相同渐变颜色、相同玻璃模糊强度、相同阴影处理、相同排版重量和样式。观众应该立即识别这是同一个演示文稿。"
}
```

```bash
python /mnt/skills/public/image-generation/scripts/generate.py \
  --prompt-file /mnt/user-data/workspace/nova-slide-02.json \
  --reference-images /mnt/user-data/outputs/nova-slide-01.jpg \
  --output-file /mnt/user-data/outputs/nova-slide-02.jpg \
  --aspect-ratio 16:9
```

**第3-5张幻灯片：继续相同模式，每张引用前一张幻灯片**

后续幻灯片的一致性关键规则：
- 始终在提示中包含"延续参考图像的精确视觉风格"
- 指定"相同渐变背景"、"相同玻璃处理"、"相同排版"
- 包含强调风格匹配的 `consistency_note`
- 引用紧接的前一张幻灯片图像

### 步骤 4：组合最终 PPT

```bash
python /mnt/skills/public/ppt-generation/scripts/generate.py \
  --plan-file /mnt/user-data/workspace/nova-plan.json \
  --slide-images /mnt/user-data/outputs/nova-slide-01.jpg /mnt/user-data/outputs/nova-slide-02.jpg /mnt/user-data/outputs/nova-slide-03.jpg /mnt/user-data/outputs/nova-slide-04.jpg /mnt/user-data/outputs/nova-slide-05.jpg \
  --output-file /mnt/user-data/outputs/nova-presentation.pptx
```

## 风格特定指南

### 玻璃态风格（推荐 - 最现代前卫）
```json
{
  "style": "glassmorphism",
  "style_guidelines": {
    "color_palette": "充满活力的渐变背景（紫色 #667eea 到粉色 #f093fb，或青色 #4facfe 到蓝色 #00f2fe）、20% 不透明度的磨砂白面板、在渐变上突出的强调色",
    "typography": "SF Pro Display 或 Inter 字体风格、标题粗体 600-700 重量、正文干净 400 重量、玻璃上可读的白色文本带微妙投影",
    "imagery": "漂浮在空间中的抽象 3D 形状、柔和模糊球体、带玻璃材料的几何原语、通过重叠半透明层创造深度",
    "layout": "带背景模糊效果的浮动卡片面板、慷慨内边距 (48-64px)、圆角 (24-32px 半径)、微妙阴影分层深度",
    "effects": "磨砂玻璃模糊 (backdrop-filter: blur 20px)、微妙白色边框 (1px rgba 255,255,255,0.2)、面板后面柔和发光、带投影的浮动元素",
    "visual_language": "Apple Vision Pro UI 等高级科技美学、通过透明度的深度、光通过玻璃表面折射"
  }
}
```

### 深色高级风格
```json
{
  "style": "dark-premium",
  "style_guidelines": {
    "color_palette": "深黑色基础 (#0a0a0a 到 #121212)、发光强调色（电蓝色 #00d4ff、霓虹紫 #bf5af2 或金色 #ffd700）、微妙灰色渐变创造深度 (#1a1a1a 到 #0a0a0a)",
    "typography": "优雅无衬线（Neue Haas Grotesk 或 Suisse Int'l 风格）、戏剧性尺寸对比 (72pt+ 标题、18pt 正文)、标题字母间距 -0.02em、纯白 (#ffffff) 文本",
    "imagery": "戏剧性影棚光线、边缘灯和边缘发光、电影产品拍摄、抽象光线轨迹、高级材质纹理（拉丝金属、哑光表面）",
    "layout": "大量负空间 (60%+)、非对称平衡、内容锚定网格但有呼吸空间、每张幻灯片单一焦点",
    "effects": "关键元素后面微妙环境发光、光晕效果、颗粒纹理叠加 (2-3% 不透明度)、边缘渐晕",
    "visual_language": "奢侈品科技品牌美学（Bang & Olufsen、保时捷设计）、通过克制实现精致、每个元素都有意图"
  }
}
```

### 渐变现代风格
```json
{
  "style": "gradient-modern",
  "style_guidelines": {
    "color_palette": "大胆网格渐变（Stripe/Linear 风格：紫-粉-橙 #7c3aed→#ec4899→#f97316，或冷色调：青-蓝-紫 #06b6d4→#3b82f6→#8b5cf6）、根据背景强度白色或深色文本",
    "typography": "现代几何无衬线（Satoshi、General Sans 或 Clash Display 风格）、可变字体重量、超大粗体标题 (80pt+)、舒适的正文 (20pt)",
    "imagery": "抽象流体形状、变形渐变、3D 渲染抽象对象、柔和有机形式、浮动几何原语",
    "layout": "动态非对称构图、带混合模式的叠覆元素、与渐变流集成的文本、整页背景",
    "effects": "平滑渐变过渡、微妙噪点纹理 (3-5% 创造深度)、与渐变颜色匹配的柔和彩色阴影、暗示运动的模糊",
    "visual_language": "当代 SaaS 美学（Stripe、Linear、Vercel）、充满活力但专业、前瞻性科技感"
  }
}
```

### 新粗野主义风格
```json
{
  "style": "neo-brutalist",
  "style_guidelines": {
    "color_palette": "高对比度原色：纯黑、纯白、带粗体强调（热粉 #ff0080、电黄 #ffff00 或原始红 #ff0000）、可选：Memphis 启发的柔和色作为次要",
    "typography": "超粗压缩字体（Impact、Druk 或 Bebas Neue 风格）、大写标题、极端尺寸对比、刻意紧凑或重叠字母间距",
    "imagery": "原始未过滤摄影、刻意的视觉噪点、半色调图案、剪切拼贴美学、手绘元素、贴纸和印章",
    "layout": "破碎网格、叠覆元素、粗黑边框 (4-8px)、可见结构、反空白（密集但有序混乱）",
    "effects": "硬阴影（无模糊、偏移 8-12px）、像素化强调、扫描线、CRT 屏幕效果、刻意的'错误'",
    "visual_language": "反企业叛逆、DIY 杂志美学遇见数字、原始真实性、通过大胆令人难忘"
  }
}
```

### 3D 等距风格
```json
{
  "style": "3d-isometric",
  "style_guidelines": {
    "color_palette": "柔和当代调色板：柔和紫 (#8b5cf6)、青绿 (#14b8a6)、暖珊瑚 (#fb7185)，带奶油或浅灰背景 (#fafafa)，元素间饱和度一致",
    "typography": "友好几何无衬线（Circular、Gilroy 或 Quicksand 风格）、中等重量标题、出色的可读性、舒适的 24pt 正文文本",
    "imagery": "干净的 3D 等距插图、一致的 30° 等距角度、柔和泥土渲染美学、浮动平台和设备、可爱的简化物体",
    "layout": "中央等距场景作为主视觉、文字围绕 3D 元素平衡、清晰视觉层次、舒适边距 (64px+)",
    "effects": "柔和投影 (20px 模糊、30% 不透明度)、3D 物体上的环境光遮蔽、表面上的微妙渐变、一致光源（左上）",
    "visual_language": "友好科技插图（Slack、Notion、Asana 风格）、平易近人的复杂性、通过简化实现清晰"
  }
}
```

### 编辑风格
```json
{
  "style": "editorial",
  "style_guidelines": {
    "color_palette": "精致中性色：米白 (#f5f5f0)、炭灰 (#2d2d2d)，带单一强调色（酒红 #7c2d12、森林绿 #14532d 或海军蓝 #1e3a5f)，偶尔全彩摄影",
    "typography": "标题用精致衬线（Playfair Display、Freight 或 Editorial New 风格）、正文用干净无衬线（Söhne、Graphik）、戏剧性尺寸层次 (96pt 标题、16pt 正文)、慷慨行高 1.6",
    "imagery": "杂志级摄影、戏剧性裁剪、整页图像、有人物特写的有意负空间、编辑光线（Vogue、Bloomberg Businessweek 风格）",
    "layout": "精致网格系统 (12 列)、有意不对称、拉引言作为设计元素、文字环绕图像、优雅边距",
    "effects": "极少效果 - 让摄影和排版发光、微妙的图像处理（轻微去饱和、胶片颗粒）、优雅边框和标尺",
    "visual_language": "高端杂志美学、知识分子精致、内容通过设计克制提升"
  }
}
```

### 极简瑞士风格
```json
{
  "style": "minimal-swiss",
  "style_guidelines": {
    "color_palette": "纯白 (#ffffff) 或米白 (#fafaf9) 背景、纯黑 (#000000) 文本、单一粗体强调（瑞士红 #ff0000、克莱因蓝 #002fa7 或信号黄 #ffcc00)",
    "typography": "Helvetica Neue 或 Aktiv Grotesk、严格类型比例 (12/16/24/48/96)、正文中等重量、仅用于强调的粗体、左对齐右不齐排版",
    "imagery": "客观摄影、几何形状、干净图标、数学精度、有意空白作为构图元素",
    "layout": "严格遵守网格（基线网格精神可见）、模块化构图、慷慨空白 (40%+ 幻灯片)、内容对齐隐形网格线",
    "effects": "无 - 形式纯粹、无阴影、无渐变、无装饰元素、偶尔单条细线",
    "visual_language": "国际印刷风格、形式追随功能、永恒现代主义、Dieter Rams 启发的克制"
  }
}
```

### Keynote 风格（Apple 风格）
```json
{
  "style": "keynote",
  "style_guidelines": {
    "color_palette": "深黑 (#000000 到 #1d1d1f)、纯白文本、签名蓝 (#0071e3) 或渐变强调（创意用紫-粉、科技用蓝-青）",
    "typography": "San Francisco Pro Display、极端重量对比（粗体 80pt+ 标题、浅色 24pt 正文)、标题负字母间距 (-0.03em)、光学对齐",
    "imagery": "电影摄影、浅景深、戏剧性光线（边缘灯、聚光灯）、带反射的产品主视觉、整页图像",
    "layout": "最大负空间、每张幻灯片单一强图像或声明、内容居中或戏剧性偏移、无杂乱",
    "effects": "微妙渐变叠加、关键元素上的光晕和发光、表面反射、平滑渐变背景",
    "visual_language": "Apple WWDC 主题演讲美学、通过简单实现自信、每个像素都考虑、戏剧性演示"
  }
}
```

## 输出处理

生成后：

- PPTX 文件保存在 `/mnt/user-data/outputs/`
- 使用 `present_files` 工具与用户分享生成的演示文稿
- 如请求也分享单个幻灯片图像
- 提供演示文稿的简要描述
- 如需要，提供迭代或重新生成特定幻灯片的选项

## 注意事项

### 关键质量指南

**专业结果的提示工程：**
- 无论用户语言如何，始终使用英语编写图像提示
- 对视觉细节极其具体 — 模糊提示产生通用结果
- 包含精确的十六进制颜色代码（例如 #667eea 而非"紫色"）
- 指定排版细节：字体重量 (400/700)、尺寸层次、字母间距
- 精确描述效果："背景模糊 20px"、"投影 8px 模糊 30% 不透明度"
- 参考真实设计系统："visionOS 美学"、"Stripe 网站风格"、"Bloomberg Businessweek 布局"

**视觉一致性（最重要）：**
- **按顺序生成幻灯片** - 每张幻灯片必须引用前一张
- 第一张幻灯片至关重要 - 它为整个演示文稿建立视觉语言
- 在每个后续幻灯片提示中，明确说明："延续参考图像的精确视觉风格"
- 使用 SAME、EXACT、MATCH 关键词强调性地强制一致性
- 在第1张之后的每个 JSON 提示中包含 `consistency_note` 字段
- 如果幻灯片看起来不一致，用更强的参考强调重新生成

**现代美学设计原则：**
- 拥抱负空间 - 40-60% 空白创造高级感
- 限制每张幻灯片的元素 - 一个焦点、一个信息
- 使用分层创造深度（阴影、透明度、z-depth）
- 排版层次：巨大标题 (72pt+)、舒适正文 (18-24pt)
- 颜色克制：一个主调色板，最多 1-2 个强调色

**要避免的常见错误：**
- ❌ 通用提示如"专业幻灯片" - 要具体
- ❌ 每张幻灯片太多元素/文字 - 杂乱 = 不专业
- ❌ 幻灯片之间颜色不一致 - 始终引用前一张幻灯片
- ❌ 跳过参考图像参数 - 这会破坏视觉一致性
- ❌ 在一个演示文稿中使用不同的设计风格
- ❌ 并行生成幻灯片 - 幻灯片必须按顺序生成（幻灯片 1 → 2 → 3...），永远不同时

**不同场景的推荐风格：**
- 科技产品发布 → `glassmorphism` 或 `gradient-modern`
- 奢华/高端品牌 → `dark-premium` 或 `editorial`
- 初创公司路演 → `gradient-modern` 或 `minimal-swiss`
- 高管演示 → `dark-premium` 或 `keynote`
- 创意机构 → `neo-brutalist` 或 `gradient-modern`
- 数据/分析 → `minimal-swiss` 或 `3d-isometric`
