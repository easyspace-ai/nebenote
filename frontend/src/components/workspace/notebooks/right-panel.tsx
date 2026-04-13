"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AudioLines,
  Brain,
  Eye,
  LoaderCircle,
  FileText,
  Map,
  Microscope,
  Presentation,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useOptionalPromptInputController } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtifactFileDetail } from "@/components/workspace/artifacts";
import { getAPIClient } from "@/core/api";
import { useNotebook } from "@/core/notebook/hooks";
import type { AgentThreadState } from "@/core/threads/types";
import { getFileExtensionDisplayName, getFileIcon, getFileName } from "@/core/utils/files";

import { useNotebookLayout } from "./notebook-layout";

// 生成功能配置 - 可在这里编辑添加新的生成类型
export interface GenerationConfig {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: React.ElementType;
  color?: string;
}

export const generationConfigs: GenerationConfig[] = [
  // Core built-in generators
  {
    id: "summary",
    title: "总结",
    description: "生成当前对话的要点总结",
    prompt: "请基于上述内容，生成一份清晰简洁的要点总结，提炼核心观点和关键信息。",
    icon: FileText,
  },
  {
    id: "mindmap",
    title: "思维导图",
    description: "生成Markdown思维导图",
    prompt: "请基于上述内容，生成一个markdown格式的思维导图，清晰展示知识结构。",
    icon: Map,
  },
  // {
  //   id: "outline",
  //   title: "大纲",
  //   description: "生成内容大纲",
  //   prompt: "请基于上述内容，生成一个结构化的内容大纲，帮助理解整体框架。",
  //   icon: FileJson,
  // },

  // Public skills integration
  {
    id: "podcast-generation",
    title: "播客",
    description: "生成双人对话播客脚本",
    prompt: "请使用 podcast-generation 技能，基于上述内容生成一个双人对话风格的播客脚本，内容生动有趣。",
    icon: AudioLines,
  },
  {
    id: "ppt-generation",
    title: "PPT",
    description: "生成演示文稿PPT",
    prompt: "请使用 ppt-generation 技能，基于上述内容生成一个专业演示文稿，选择合适的风格并生成完整PPTX文件。",
    icon: Presentation,
  },
  // {
  //   id: "image-generation",
  //   title: "图像生成",
  //   description: "生成AI图像",
  //   prompt: "请使用 image-generation 技能，基于上述内容描述生成对应的AI图像。",
  //   icon: ImageIcon,
  // },
  // {
  //   id: "video-generation",
  //   title: "视频生成",
  //   description: "生成视频脚本",
  //   prompt: "请使用 video-generation 技能，基于上述内容生成视频脚本和分镜。",
  //   icon: Video,
  // },
  {
    id: "deep-research",
    title: "深度研究",
    description: "系统化深度网络研究",
    prompt: "请使用 deep-research 技能，对上述主题进行系统化多角度深度网络研究。",
    icon: Microscope,
  },
  // {
  //   id: "data-analysis",
  //   title: "数据分析",
  //   description: "分析数据生成图表报告",
  //   prompt: "请使用 data-analysis 技能，对上述数据进行分析并生成可视化图表和分析报告。",
  //   icon: BarChart3,
  // },
  // {
  //   id: "code-documentation",
  //   title: "代码文档",
  //   description: "生成代码文档说明",
  //   prompt: "请使用 code-documentation 技能，为上述代码生成清晰完整的文档说明。",
  //   icon: FileCode,
  // },
  // {
  //   id: "frontend-design",
  //   title: "前端设计",
  //   description: "设计实现前端界面",
  //   prompt: "请使用 frontend-design 技能，基于上述需求设计并实现完整的前端界面。",
  //   icon: Code,
  // },
  {
    id: "academic-paper-review",
    title: "论文评审",
    description: "学术论文评审报告",
    prompt: "请使用 academic-paper-review 技能，对这篇学术论文进行专业评审，给出详细评审意见。",
    icon: Brain,
  },
  // {
  //   id: "newsletter-generation",
  //   title: "简报",
  //   description: "生成新闻简报/周刊",
  //   prompt: "请使用 newsletter-generation 技能，基于上述内容生成一份精美的新闻简报。",
  //   icon: FileText,
  // },
  // {
  //   id: "github-deep-research",
  //   title: "GitHub研究",
  //   description: "深入分析GitHub仓库",
  //   prompt: "请使用 github-deep-research 技能，深入分析这个GitHub仓库的结构、功能和代码质量。",
  //   icon: Github,
  // },
  // {
  //   id: "systematic-literature-review",
  //   title: "文献综述",
  //   description: "系统化文献综述",
  //   prompt: "请使用 systematic-literature-review 技能，对该主题进行系统化文献综述。",
  //   icon: FileText,
  // },
  // {
  //   id: "consulting-analysis",
  //   title: "咨询分析",
  //   description: "商业咨询分析报告",
  //   prompt: "请使用 consulting-analysis 技能，基于上述问题进行专业商业咨询分析。",
  //   icon: BarChart3,
  // },
];

interface RightPanelProps {
  notebookId: string;
}

interface NotebookArtifactItem {
  key: string;
  filepath: string;
  threadId: string;
}

export function RightPanel({ notebookId }: RightPanelProps) {
  const { rightOpen, toggleRight } = useNotebookLayout();
  const promptInputController = useOptionalPromptInputController();
  const [previewArtifact, setPreviewArtifact] = useState<NotebookArtifactItem | null>(null);
  const { data: notebook } = useNotebook(notebookId);
  const notebookThreadIds = notebook?.thread_ids ?? [];
  const { data: notebookArtifacts = [], isLoading: isNotebookArtifactsLoading } = useQuery({
    queryKey: ["notebook-artifacts", notebookId, notebookThreadIds],
    enabled: notebookThreadIds.length > 0,
    queryFn: async (): Promise<NotebookArtifactItem[]> => {
      const apiClient = getAPIClient();
      const settled = await Promise.all(
        notebookThreadIds.map(async (threadId) => {
          try {
            const state = await apiClient.threads.getState<AgentThreadState>(threadId);
            return {
              threadId,
              artifacts: state.values?.artifacts ?? [],
            };
          } catch {
            return {
              threadId,
              artifacts: [],
            };
          }
        }),
      );

      const items: NotebookArtifactItem[] = [];
      const seen = new Set<string>();
      for (let i = settled.length - 1; i >= 0; i -= 1) {
        const group = settled[i];
        if (!group) continue;
        for (const filepath of group.artifacts) {
          if (!filepath || seen.has(filepath)) continue;
          seen.add(filepath);
          items.push({
            key: `${group.threadId}:${filepath}`,
            filepath,
            threadId: group.threadId,
          });
        }
      }
      return items;
    },
  });

  const artifactFiles = useMemo(
    () => notebookArtifacts.map((item) => item.filepath),
    [notebookArtifacts],
  );

  const handleCardClick = (config: GenerationConfig) => {
    // Try via context first
    if (promptInputController?.textInput) {
      const { textInput } = promptInputController;
      const current = (textInput.value ?? "").trim();
      const next = current ? `${current}\n\n${config.prompt}` : config.prompt;
      textInput.setInput(next);

      // Focus the textarea
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>(
          "textarea[name='message']",
        );
        textarea?.focus();
      }, 100);
      return;
    }

    // Fallback: directly DOM manipulation
    const textarea = document.querySelector<HTMLTextAreaElement>(
      "textarea[name='message']",
    );
    if (textarea) {
      const current = textarea.value.trim();
      const next = current ? `${current}\n\n${config.prompt}` : config.prompt;
      textarea.value = next;
      
      // Trigger input event to update React state
      const inputEvent = new Event('input', { bubbles: true });
      textarea.dispatchEvent(inputEvent);
      
      textarea.focus();
      return;
    }

    // Final fallback: copy to clipboard
    void navigator.clipboard.writeText(config.prompt);
  };

  if (!rightOpen) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Studio</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleRight}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            {generationConfigs.map((config) => {
              const Icon = config.icon;
              return (
                <GenerationCard
                  key={config.id}
                  config={config}
                  icon={<Icon className="h-5 w-5" />}
                  onClick={() => handleCardClick(config)}
                />
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-border/50 px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              笔记本产物
            </span>
            <span className="text-xs text-muted-foreground">{artifactFiles.length}</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {isNotebookArtifactsLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                加载产物中...
              </div>
            ) : artifactFiles.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                暂无产物
              </p>
            ) : (
              <ul className="space-y-1 pr-2">
                {notebookArtifacts.map((artifact) => (
                  <li key={artifact.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewArtifact(artifact);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <div className="shrink-0 text-primary">
                        {getFileIcon(artifact.filepath, "h-4 w-4")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {getFileName(artifact.filepath)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {getFileExtensionDisplayName(artifact.filepath)} file
                        </p>
                      </div>
                      <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </div>

      <Dialog
        open={Boolean(previewArtifact)}
        onOpenChange={(open) => {
          if (!open) setPreviewArtifact(null);
        }}
      >
        <DialogContent className="h-[82vh] max-w-6xl overflow-hidden p-0">
          <DialogTitle className="sr-only">Artifact preview</DialogTitle>
          {previewArtifact ? (
            <ArtifactFileDetail
              className="h-full w-full"
              filepath={previewArtifact.filepath}
              threadId={previewArtifact.threadId}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              当前会话不可预览该产物
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GenerationCard({
  config,
  icon,
  onClick,
}: {
  config: GenerationConfig;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md border border-border/50 bg-muted/60 px-3 py-3 text-left transition-colors hover:bg-muted/80"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="text-sm font-medium">{config.title}</span>
    </button>
  );
}
