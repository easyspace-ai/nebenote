---
name: github-deep-research
description: 对任何 GitHub 仓库进行多轮深度研究。当用户请求全面分析、时间线重建、竞争分析或深入调查 GitHub 时使用。生成包含执行摘要、时间线、指标分析和 Mermaid 图表的结构化 markdown 报告。在 GitHub 仓库 URL 或开源项目时触发。
---

# GitHub 深度研究技能

多轮研究，结合 GitHub API、web_search、web_fetch 生成全面的 markdown 报告。

## 研究工作流程

- 第一轮：GitHub API
- 第二轮：发现
- 第三轮：深入调查
- 第四轮：深度挖掘

## 核心方法论

### 查询策略

**从宽到窄**：从 GitHub API 开始，然后是常规查询，根据发现细化。

```
第一轮：GitHub API
第二轮："{主题} 概述"
第三轮："{主题} 架构"，"{主题} vs 替代方案"
第四轮："{主题} 问题"，"{主题} 路线图"，"site:github.com {主题}"
```

**来源优先级**：
1. 官方文档/仓库（最高权重）
2. 技术博客（中等，Dev.to）
3. 新闻文章（已验证的媒体）
4. 社区讨论（Reddit、HN）
5. 社交媒体（最低权重，用于情感）

### 研究轮次

**第一轮 - GitHub API**
直接执行 `scripts/github_api.py` 而不 `read_file()`：
```bash
python /path/to/skill/scripts/github_api.py <owner> <repo> summary
python /path/to/skill/scripts/github_api.py <owner> <repo> readme
python /path/to/skill/scripts/github_api.py <owner> <repo> tree
```

**可用命令（`github_api.py` 的最后一个参数）：**
- summary
- info
- readme
- tree
- languages
- contributors
- commits
- issues
- prs
- releases

**第二轮 - 发现（3-5 次 web_search）**
- 获取概述并识别关键词
- 找到官方网站/仓库
- 识别主要参与者/竞争对手

**第三轮 - 深入调查（5-10 次 web_search + web_fetch）**
- 技术架构细节
- 关键事件时间线
- 社区情感
- 对有价值的 URL 使用 web_fetch 获取完整内容

**第四轮 - 深度挖掘**
- 分析提交历史以获取时间线
- 审查 issues/PRs 以了解功能演进
- 检查贡献者活动

## 报告结构

遵循 `assets/report_template.md` 中的模板：

1. **元数据块** - 日期、置信度级别、主题
2. **执行摘要** - 带关键指标的 2-3 句概述
3. **时间线** - 按日期的分阶段分解
4. **关键分析章节** - 特定主题的深入探讨
5. **指标与比较** - 表格、增长图表
6. **优势与劣势** - 平衡评估
7. **来源** - 分类引用
8. **置信度评估** - 按置信度级别的声明
9. **方法论** - 使用的研究方法

### Mermaid 图表

在有帮助的地方包含图表：

**时间线（Gantt）**：
```mermaid
gantt
    title 项目时间线
    dateFormat YYYY-MM-DD
    section 第一阶段
    开发    :2025-01-01, 2025-03-01
    section 第二阶段
    发布         :2025-03-01, 2025-04-01
```

**架构（流程图）**：
```mermaid
flowchart TD
    A[用户] --> B[协调器]
    B --> C[规划器]
    C --> D[研究团队]
    D --> E[报告器]
```

**比较（饼图/柱状图）**：
```mermaid
pie title 市场份额
    "项目 A" : 45
    "项目 B" : 30
    "其他" : 25
```

## 置信度评分

根据来源质量分配置信度：

| 置信度 | 标准 |
|------------|----------|
| 高（90%+）| 官方文档、GitHub 数据、多个相互印证来源 |
| 中（70-89%）| 单一可靠来源、最新文章 |
| 低（50-69%）| 社交媒体、未验证声明、过时信息 |

## 输出

保存报告为：`research_{topic}_{YYYYMMDD}.md`

### 格式规则

- 中文内容：使用全角标点（，。：；！？）
- 技术术语：首次提及时提供 Wiki/doc URL
- 表格：用于指标、比较
- 代码块：用于技术示例
- Mermaid：用于架构、时间线、流程

## 最佳实践

1. **从官方来源开始** - 仓库、文档、公司博客
2. **从提交/PR 验证日期** - 比文章更可靠
3. **三角定位声明** - 2+ 个独立来源
4. **注意矛盾信息** - 不要隐藏矛盾
5. **区分事实与观点** - 清楚标注推测
6. **关键：始终包含内联引用** - 使用 `[引用:标题](URL)` 格式，在每个外部来源声明后立即标注
7. **从搜索结果中提取 URL** - web_search 返回 {title, url, snippet} - 始终使用 URL 字段
8. **边走边更新** - 不要等到最后才综合

### 引用示例

**好 - 带内联引用：**
```markdown
该项目在发布后 3 个月内获得了 10,000 颗星 [citation:GitHub 统计](https://github.com/owner/repo)。
该架构使用 LangGraph 进行工作流编排 [citation:LangGraph 文档](https://langchain.com/langgraph)。
```

**坏 - 没有引用：**
```markdown
该项目在发布后 3 个月内获得了 10,000 颗星。
该架构使用 LangGraph 进行工作流编排。
```
