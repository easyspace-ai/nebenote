---
name: podcast-generation
description: 当用户请求从文本内容生成、创建或制作播客时使用此技能。将书面内容转换为两个主持人对话风格的播客音频格式，带有自然的对话。
---

# 播客生成技能

## 概述

本技能从文本内容生成高质量播客音频。工作流程包括创建结构化 JSON 脚本（对话式对话）并通过文本转语音合成执行音频生成。

## 核心能力

- 将任何文本内容（文章、报告、文档）转换为播客脚本
- 生成自然的两个主持人对话式对话（男声和女声主持人）
- 使用文本转语音合成语音音频
- 将音频片段混合成最终播客 MP3 文件
- 支持英语和中文内容

## 工作流程

### 步骤 1：理解需求

当用户请求播客生成时，识别：

- 源内容：要转换为播客的文本/文章/报告
- 语言：英语或中文（基于内容）
- 输出位置：保存生成播客的位置
- 不需要检查 `/mnt/user-data` 下的文件夹

### 步骤 2：创建结构化脚本 JSON

在 `/mnt/user-data/workspace/` 中生成结构化 JSON 脚本文件，命名模式：`{描述性名称}-script.json`

JSON 结构：
```json
{
  "locale": "en",
  "lines": [
    {"speaker": "male", "paragraph": "dialogue text"},
    {"speaker": "female", "paragraph": "dialogue text"}
  ]
}
```

### 步骤 3：执行生成

调用 Python 脚本：
```bash
python /mnt/skills/public/podcast-generation/scripts/generate.py \
  --script-file /mnt/user-data/workspace/script-file.json \
  --output-file /mnt/user-data/outputs/generated-podcast.mp3 \
  --transcript-file /mnt/user-data/outputs/generated-podcast-transcript.md
```

参数：

- `--script-file`：JSON 脚本文件的绝对路径（必填）
- `--output-file`：输出 MP3 文件的绝对路径（必填）
- `--transcript-file`：输出转录 markdown 文件的绝对路径（可选，但建议）

> [!IMPORTANT]
> - 在一次完整调用中执行脚本。不要将工作流程拆分为单独的步骤。
> - 脚本在内部处理所有 TTS API 调用和音频生成。
> - 不要读取 Python 文件，只需用参数调用它。
> - 始终包含 `--transcript-file` 以生成用户可读的转录。

## 脚本 JSON 格式

脚本 JSON 文件必须遵循此结构：

```json
{
  "title": "人工智能的历史",
  "locale": "en",
  "lines": [
    {"speaker": "male", "paragraph": "你好 Deer！欢迎回到又一集精彩的节目。"},
    {"speaker": "female", "paragraph": "嘿大家好！今天我们有一个令人兴奋的话题要讨论。"},
    {"speaker": "male", "paragraph": "没错！我们将要谈论的是..."}
  ]
}
```

字段：
- `title`：播客剧集标题（可选，用于转录中的标题）
- `locale`：语言代码 - "en" 表示英语，"zh" 表示中文
- `lines`：对话行数组
  - `speaker`："male" 或 "female"
  - `paragraph`：此发言人的对话文本

## 脚本写作指南

创建脚本 JSON 时，遵循这些指南：

### 格式要求
- 只有两个主持人：男声和女声，自然交替
- 目标时长：约 10 分钟对话（约 40-60 行）
- 以男声主持人说包含"你好 Deer"的问候开始

### 语气与风格
- 自然、对话式对话 — 像两个朋友聊天
- 使用口语表达和对话过渡
- 避免过于正式的语言或学术语气
- 包含反应、跟进问题和自然的插入语

### 内容指南
- 主持人之间频繁来回
- 保持句子简短，便于口语理解
- 仅纯文本 — 输出中无 markdown 格式
- 将技术概念翻译成易懂语言
- 无数学公式、代码或复杂符号
- 使内容引人入胜且适合纯音频听众
- 排除元信息如日期、作者姓名或文档结构

## 播客生成示例

用户请求："生成一个关于人工智能历史的播客"

步骤 1：创建脚本文件 `/mnt/user-data/workspace/ai-history-script.json`：
```json
{
  "title": "人工智能的历史",
  "locale": "en",
  "lines": [
    {"speaker": "male", "paragraph": "你好 Deer！欢迎回到又一集精彩的节目。今天我们要深入探讨真正塑造我们未来的东西 — 人工智能的历史。"},
    {"speaker": "female", "paragraph": "哦，我喜欢这个话题！你知道吗，AI 感觉如此现代，但实际上它的根源可以追溯到七十多年前。"},
    {"speaker": "male", "paragraph": "没错！一切都始于 1950 年代。'人工智能'这个术语实际上是由约翰·麦卡锡在 1956 年达特茅斯的一次著名会议上提出的。"},
    {"speaker": "female", "paragraph": "等等，所以早在那个时候他们就已经在思考会思考的机器了？这太不可思议了！"},
    {"speaker": "male", "paragraph": "对吧？早期的先驱们非常乐观。他们认为我们会在一代人的时间内实现人类水平的人工智能。"},
    {"speaker": "female", "paragraph": "但事情并没有完全按照那样发展，对吧？"},
    {"speaker": "male", "paragraph": "确实没有。1970 年代带来了所谓的人工智能第一次寒冬..."}
  ]
}
```

步骤 2：执行生成：
```bash
python /mnt/skills/public/podcast-generation/scripts/generate.py \
  --script-file /mnt/user-data/workspace/ai-history-script.json \
  --output-file /mnt/user-data/outputs/ai-history-podcast.mp3 \
  --transcript-file /mnt/user-data/outputs/ai-history-transcript.md
```

这将生成：
- `ai-history-podcast.mp3`：音频播客文件
- `ai-history-transcript.md`：播客的可读 markdown 转录

## 特定模板

仅在匹配用户请求时读取以下模板文件。

- [技术解释器](templates/tech-explainer.md) - 用于转换技术文档和教程

## 输出格式

生成的播客遵循"你好 Deer"格式：
- 两个主持人：一男一女
- 自然对话式对话
- 以"你好 Deer"问候开始
- 目标时长：约 10 分钟
- 发言者交替以获得引人入胜的流程

## 输出处理

生成后：

- 播客和转录保存在 `/mnt/user-data/outputs/`
- 使用 `present_files` 工具与用户分享播客 MP3 和转录 MD
- 提供生成结果的简要描述（主题、时长、主持人）
- 如需调整，提供重新生成选项

## 要求

必须设置以下环境变量：
- `VOLCENGINE_TTS_APPID`：火山引擎 TTS 应用 ID
- `VOLCENGINE_TTS_ACCESS_TOKEN`：火山引擎 TTS 访问令牌
- `VOLCENGINE_TTS_CLUSTER`：火山引擎 TTS 集群（可选，默认为"volcano_tts"）

## 注意事项

- **始终在一次调用中执行完整管道** - 无需测试单个步骤或担心超时
- 脚本 JSON 应匹配内容语言（en 或 zh）
- 技术内容应在脚本中为音频可访问性简化
- 复杂符号（公式、代码）应在脚本中翻译成纯语言
- 长内容可能导致更长的播客
