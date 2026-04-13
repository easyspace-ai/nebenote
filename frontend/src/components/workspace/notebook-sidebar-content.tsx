"use client";

import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import {
  FileText,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/core/i18n/hooks";
import {
  useCreateThread,
  useDeleteDocument,
  useDocuments,
  useNotebook,
  useUploadDocument,
} from "@/core/notebook/hooks";
import type { Document } from "@/core/notebook/types";
import { useThreads as useWorkspaceThreads } from "@/core/threads/hooks";
import { titleOfThread } from "@/core/threads/utils";
import { cn } from "@/lib/utils";

export function NotebookSidebarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ notebookId: string; threadId?: string }>();
  const notebookId = params.notebookId;
  const threadIdFromRoute = params.threadId;
  const { locale } = useI18n();
  const dateLocale = locale === "zh-CN" ? zhCN : enUS;

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId);
  const { data: documents, isLoading: docsLoading } = useDocuments(notebookId);
  const { data: workspaceThreads = [] } = useWorkspaceThreads();
  const uploadDocument = useUploadDocument(notebookId);
  const deleteDocument = useDeleteDocument(notebookId);
  const createThread = useCreateThread(notebookId);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!searchQuery) return documents;
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setUploadFiles(Array.from(files));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadFiles(prev => [...prev, ...files]);
    }
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    try {
      for (const file of uploadFiles) {
        await uploadDocument.mutateAsync({ file, title: file.name });
      }
      setUploadFiles([]);
      setUploadDialogOpen(false);
    } catch (error) {
      console.error(error);
    }
  }, [uploadDocument, uploadFiles]);

  const notebookThreads = useMemo(() => {
    const threadMap = new Map(
      workspaceThreads.map((thread) => [thread.thread_id, thread] as const),
    );

    return (notebook?.thread_ids ?? []).map((threadId) => ({
      threadId,
      title: threadMap.get(threadId)
        ? titleOfThread(threadMap.get(threadId)!)
        : `对话 · ${threadId.slice(0, 8)}`,
    }));
  }, [notebook?.thread_ids, workspaceThreads]);

  const handleCreateThread = useCallback(async () => {
    try {
      const result = await createThread.mutateAsync("新对话");
      router.push(`/workspace/notebooks/${notebookId}/chats/${result.thread_id}`);
    } catch (error) {
      console.error(error);
    }
  }, [createThread, notebookId, router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-sidebar-border/70 px-4 py-3">
        <p className="line-clamp-1 text-sm font-semibold text-sidebar-foreground">
          {notebookLoading ? "加载中…" : notebook?.title ?? "未命名项目"}
        </p>
      </div>

      <Tabs defaultValue="threads" className="flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-none border-b border-sidebar-border/70 bg-transparent p-0">
          <TabsTrigger
            value="threads"
            className="h-full rounded-none border-b-2 border-transparent text-sm data-[state=active]:border-sidebar-foreground data-[state=active]:bg-transparent data-[state=active]:text-sidebar-foreground"
          >
            对话
          </TabsTrigger>
          <TabsTrigger
            value="uploads"
            className="h-full rounded-none border-b-2 border-transparent text-sm data-[state=active]:border-sidebar-foreground data-[state=active]:bg-transparent data-[state=active]:text-sidebar-foreground"
          >
            资料
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="threads"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-semibold text-sidebar-foreground">
              对话
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
              onClick={() => void handleCreateThread()}
              disabled={createThread.isPending}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 pr-1">
              <button
                type="button"
                onClick={() => router.push(`/workspace/notebooks/${notebookId}/chats`)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  pathname === `/workspace/notebooks/${notebookId}/chats`
                    ? "bg-muted text-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
                )}
              >
                <MessageSquare className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  新对话
                </span>
              </button>

              {notebookThreads.map((thread) => {
                const active = threadIdFromRoute === thread.threadId;

                return (
                  <button
                    key={thread.threadId}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/workspace/notebooks/${notebookId}/chats/${thread.threadId}`,
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
                    )}
                  >
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {thread.title}
                    </span>
                  </button>
                );
              })}

              {!notebookLoading && notebookThreads.length === 0 && (
                <div className="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-8 text-center text-xs leading-6 text-sidebar-foreground/55">
                  还没有会话。
                  <br />
                  点击上方“新对话”开始。
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="uploads"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          {/* 搜索和添加按钮 - 参考设计图：两个图标在右上角 */}
          <div className="flex flex-col gap-2 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">
                资料
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-lg p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                  onClick={() => setSearchVisible(!searchVisible)}
                >
                  <Search className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-lg p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            {searchVisible && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
                <Input
                  type="search"
                  placeholder="搜索资料..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border-sidebar-border/70 bg-sidebar pl-9 pr-3 text-sm placeholder:text-sidebar-foreground/50 focus:border-sidebar-accent focus:ring-sidebar-accent/20"
                />
              </div>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 pr-1">
              {docsLoading && (
                <p className="px-2 py-4 text-xs text-sidebar-foreground/55">
                  正在加载资料…
                </p>
              )}

              {!docsLoading && (!filteredDocuments || filteredDocuments.length === 0) && (
                <div className="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-8 text-center text-xs leading-6 text-sidebar-foreground/55">
                  {searchQuery ? "没有找到匹配的资料" : "还没有上传资料。"}
                  <br />
                  {!searchQuery && "点击右上角 + 上传资料"}
                </div>
              )}

              {filteredDocuments?.map((doc) => (
                <NotebookDocumentRow
                  key={doc.doc_id}
                  doc={doc}
                  dateLocale={dateLocale}
                  onDelete={() => void deleteDocument.mutateAsync(doc.doc_id)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* 添加资料弹窗 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>添加资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 拖拽上传区域 */}
            <div
              className={cn(
                "rounded-2xl border-2 border-dashed border-sidebar-border/70 p-8 text-center transition-colors",
                "hover:border-sidebar-accent hover:bg-sidebar-accent/5"
              )}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-sidebar-accent/10">
                <Upload className="size-8 text-sidebar-accent" />
              </div>
              <p className="text-base font-medium text-sidebar-foreground">
                拖拽文件到这里，或点击上传文件
              </p>
              <p className="mt-2 text-sm text-sidebar-foreground/60">
                支持 PDF、文档、图片、音频、视频等
              </p>
              <input
                id="upload-dialog-input"
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp3,.mp4,.mov,.avi"
                onChange={(event) => handleFileSelect(event.target.files)}
              />
              <Button
                type="button"
                variant="secondary"
                className="mt-6"
                onClick={() =>
                  document.getElementById("upload-dialog-input")?.click()
                }
              >
                选择文件
              </Button>
            </div>

            {/* 待上传文件列表 */}
            {uploadFiles.length > 0 && (
              <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-2xl border border-sidebar-border/70 bg-sidebar p-3">
                {uploadFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className="flex items-center gap-3 rounded-xl bg-sidebar-background/50 px-3 py-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                      <FileText className="size-4" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="size-4 text-sidebar-foreground/50" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  className="mt-3 h-10 w-full rounded-xl"
                  onClick={handleUpload}
                  disabled={uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "上传中…" : "开始上传"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotebookDocumentRow({
  doc,
  dateLocale,
  onDelete,
}: {
  doc: Document;
  dateLocale: typeof zhCN;
  onDelete: () => void;
}) {
  // 提取文件扩展名，给不同类型显示不同图标
  const getFileIcon = () => {
    // 可以扩展更多类型，现在统一用FileText
    return <FileText className="size-4 shrink-0" />;
  };

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
      )}
    >
      {getFileIcon()}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">
        {doc.title}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-sidebar-foreground/55 hover:bg-destructive/10 hover:text-destructive"
        title="删除资料"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("确定删除这份资料？")) onDelete();
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </button>
  );
}
