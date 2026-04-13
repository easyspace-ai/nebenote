"use client";

import { Sparkles, FileText, AudioLines, Presentation, Brain, Map, Microscope, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useOptionalPromptInputController } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArtifactsOptional } from "@/components/workspace/artifacts/context";
import { useThreadOptional } from "@/components/workspace/messages/context";

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

export function RightPanel({ notebookId: _notebookId }: RightPanelProps) {
  const { rightOpen, toggleRight } = useNotebookLayout();
  const threadContext = useThreadOptional();
  const artifactsContext = useArtifactsOptional();
  const promptInputController = useOptionalPromptInputController();

  const thread = threadContext?.thread;
  useParams<{ threadId?: string }>();
  const artifactFiles = useMemo(
    () => thread?.values.artifacts ?? [],
    [thread?.values.artifacts],
  );

  useEffect(() => {
    if (!artifactsContext) return;
    const { setArtifacts, deselect, setOpen: setArtifactsOpen } = artifactsContext;
    setArtifacts(artifactFiles);
    if (!artifactFiles.length) {
      deselect();
      setArtifactsOpen(false);
      return;
    }
    if (
      artifactsContext.selectedArtifact &&
      !artifactFiles.includes(artifactsContext.selectedArtifact)
    ) {
      deselect();
      setArtifactsOpen(false);
    }
  }, [artifactFiles, artifactsContext]);

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

      {/* Content - Only show generate grid, no tabs */}
      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea className="flex-1 px-3 py-3">
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
        </ScrollArea>
      </div>
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
