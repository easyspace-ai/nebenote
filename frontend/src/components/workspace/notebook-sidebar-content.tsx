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
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  // Auto-create first thread when notebook is empty
  const hasNoThreads = notebook?.thread_ids?.length === 0;
  const isEmptyNotebook = !notebookLoading && hasNoThreads;

  // Use a ref to track whether we've already attempted auto-creation
  // This prevents double-creation in React strict mode (development)
  const autoCreatedRef = React.useRef(false);
  
  // Auto-redirect to create a new thread if notebook is empty
  React.useEffect(() => {
    if (isEmptyNotebook && !threadIdFromRoute && !createThread.isPending && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      void handleCreateThread();
    }
  }, [isEmptyNotebook, threadIdFromRoute, createThread.isPending, handleCreateThread]);

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
          <div className="flex items-center justify-between pt-4">
            <span className="text-xl font-semibold text-sidebar-foreground">
              对话
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-xl p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                onClick={() => setSearchVisible(!searchVisible)}
              >
                <Search className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-xl p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                onClick={() => void handleCreateThread()}
                disabled={createThread.isPending}
              >
                <Plus className="size-5" />
              </Button>
            </div>
          </div>
          {searchVisible && (
            <div className="relative pt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
              <Input
                type="search"
                placeholder="搜索对话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border-sidebar-border/70 bg-sidebar pl-9 pr-3 text-base placeholder:text-sidebar-foreground/50 focus:border-sidebar-accent focus:ring-sidebar-accent/20"
              />
            </div>
          )}

          <ScrollArea className="min-h-0 flex-1 pt-3">
            <div className="space-y-3 pr-2 pb-4">
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
                      "flex w-full items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar px-4 py-3 text-left transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground",
                    )}
                  >
                    <MessageSquare className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-base font-medium text-sidebar-foreground">
                      {thread.title}
                    </span>
                  </button>
                );
              })}

              {!notebookLoading && notebookThreads.length === 0 && (
                <div className="rounded-2xl border border-dashed border-sidebar-border/70 px-3 py-8 text-center text-sm leading-6 text-sidebar-foreground/55">
                  还没有对话。
                  <br />
                  点击上方 + 按钮开始新对话。
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="uploads"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          {/* 选择文件按钮 - 和参考截图一致：放在列表顶部 */}
          <div className="pt-4">
            <Button
              type="button"
              variant="secondary"
              className="h-16 w-full justify-center rounded-2xl border border-sidebar-border/70 bg-sidebar text-lg font-medium text-sidebar-foreground hover:bg-sidebar-accent/10"
              onClick={() => document.getElementById("upload-inline-input")?.click()}
            >
              <Upload className="mr-3 size-6" />
              ↑ 选择文件
            </Button>
          </div>

          <input
            id="upload-inline-input"
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.mp3,.mp4,.mov,.avi"
            onChange={(event) => handleFileSelect(event.target.files)}
          />

          {/* 已选择待上传文件列表 - 像参考图那样展示 */}
          {uploadFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              {uploadFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar px-4 py-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-sidebar-foreground">
                      {file.name}
                    </p>
                    <p className="mt-1 text-sm text-sidebar-foreground/55">
                      ready
                    </p>
                  </div>
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
              {uploadFiles.length > 0 && (
                <Button
                  type="button"
                  className="mt-2 h-12 w-full rounded-xl"
                  onClick={handleUpload}
                  disabled={uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "上传中…" : "开始上传"}
                </Button>
              )}
            </div>
          )}

          <ScrollArea className="min-h-0 flex-1 pt-3">
            <div className="space-y-3 pr-2 pb-4">
              {docsLoading && (
                <p className="px-2 py-4 text-sm text-sidebar-foreground/55">
                  正在加载资料…
                </p>
              )}

              {!docsLoading && (!filteredDocuments || filteredDocuments.length === 0) && (
                <div className="rounded-2xl border border-dashed border-sidebar-border/70 px-3 py-8 text-center text-sm leading-6 text-sidebar-foreground/55">
                  {searchQuery ? "没有找到匹配的资料" : "还没有上传资料。"}
                  <br />
                  {!searchQuery && "点击上方选择文件上传资料"}
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

      {/* 添加资料弹窗保留用于拖拽上传 */}
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
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar px-4 py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
          <FileText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-sidebar-foreground">
            {doc.title}
          </p>
          <p className="mt-1 text-sm text-sidebar-foreground/55">
            {formatDistanceToNow(new Date(doc.created_at * 1000), {
              addSuffix: true,
              locale: dateLocale,
            })} · {doc.status}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-sidebar-foreground/55 hover:bg-destructive/10 hover:text-destructive"
          title="删除资料"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>删除资料</DialogTitle>
          </DialogHeader>
          <p className="text-sidebar-foreground/70 text-sm">确定删除这份资料吗？</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
