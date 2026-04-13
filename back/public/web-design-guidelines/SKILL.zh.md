---
name: web-design-guidelines
description: 审查 UI 代码是否符合 Web Interface Guidelines。当被要求"review my UI"、"check accessibility"、"audit design"、"review UX"或"check my site against best practices"时使用。
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

审查文件是否符合 Web Interface Guidelines。

## 工作原理

1. 从下面的源 URL 获取最新指南
2. 读取指定文件（或提示用户输入文件/模式）
3. 对照获取的指南中的所有规则检查
4. 以简洁的 `file:line` 格式输出发现

## 指南来源

在每次审查前获取最新指南：

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

使用 WebFetch 检索最新规则。获取的内容包含所有规则和输出格式说明。

## 使用方法

当用户提供文件或模式参数时：
1. 从上面的源 URL 获取指南
2. 读取指定文件
3. 应用获取的指南中的所有规则
4. 使用指南中指定的格式输出发现

如果没有指定文件，询问用户要审查哪些文件。
