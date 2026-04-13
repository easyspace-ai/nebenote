"use client";

import { Sparkles, FileText, ImageIcon, AudioLines, Code, Wand2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtifactFileDetail } from "@/components/workspace/artifacts/artifact-file-detail";
import { ArtifactFileList } from "@/components/workspace/artifacts/artifact-file-list";
import { useArtifactsOptional } from "@/components/workspace/artifacts/context";
import { useThreadOptional } from "@/components/workspace/messages/context";

import { useNotebookLayout } from "./notebook-layout";

interface RightPanelProps {
  notebookId: string;
}

export function RightPanel({ notebookId: _notebookId }: RightPanelProps) {
  const { rightOpen, toggleRight } = useNotebookLayout();
  const threadContext = useThreadOptional();
  const artifactsContext = useArtifactsOptional();

  const thread = threadContext?.thread;
  const params = useParams<{ threadId?: string }>();
  const threadId = params.threadId;
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

  if (!rightOpen) return null;

  const selectedArtifact = artifactsContext?.selectedArtifact ?? null;
  const artifactsOpen = artifactsContext?.open ?? false;

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

      {/* Content */}
      <Tabs defaultValue="generate" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid h-9 grid-cols-3 rounded-lg border border-border/70 bg-transparent p-0">
          <TabsTrigger value="generate" className="text-xs">
            生成
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="text-xs">
            产出
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-xs">
            工具
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-3">
              <GenerationCard
                icon={<FileText className="h-4 w-4" />}
                title="总结"
                description="生成当前对话的要点总结"
              />
              <GenerationCard
                icon={<AudioLines className="h-4 w-4" />}
                title="播客脚本"
                description="生成双人对话风格的播客脚本"
              />
              <GenerationCard
                icon={<ImageIcon className="h-4 w-4" />}
                title="可视化"
                description="根据对话内容生成图表、思维导图等"
              />
              <GenerationCard
                icon={<Code className="h-4 w-4" />}
                title="代码示例"
                description="提取对话中的代码并生成可运行示例"
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="artifacts" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-3 py-3">
            {!artifactFiles.length && (
              <div className="text-muted-foreground py-8 text-center text-sm">
                暂无产出物
                <p className="mt-1 text-xs">生成的文件将显示在这里</p>
              </div>
            )}
            {artifactFiles.length > 0 && threadId && artifactsContext && (
              <ArtifactFileList
                className="gap-2"
                files={artifactFiles}
                threadId={threadId}
              />
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="tools" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-2">
              <ToolItem name="Web Search" description="搜索网络信息" />
              <ToolItem name="Calculator" description="数学计算" />
              <ToolItem name="Code Interpreter" description="运行代码" />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {artifactsContext && artifactsOpen && selectedArtifact && threadId && (
        <div className="border-t border-border/50">
          <ArtifactFileDetail
            className="h-[56vh] min-h-[360px]"
            filepath={selectedArtifact}
            threadId={threadId}
          />
        </div>
      )}
    </div>
  );
}

function GenerationCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button className="w-full rounded-xl border border-border/50 bg-[#ECECEC]/90 p-3 text-left transition-colors hover:bg-[#E5E5E5]">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function ToolItem({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
      <Wand2 className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
