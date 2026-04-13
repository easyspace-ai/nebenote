"use client";

import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import {
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setUploadFiles(Array.from(files));
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    try {
      for (const file of uploadFiles) {
        await uploadDocument.mutateAsync({ file, title: file.name });
      }
      setUploadFiles([]);
    } catch (error) {
      console.error(error);
    }
  }, [uploadDocument, uploadFiles]);

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
          <div className="space-y-2 py-4">
            <input
              id="notebook-sidebar-upload-input"
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
              onChange={(event) => handleFileSelect(event.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full justify-center rounded-xl border border-sidebar-border/70 bg-sidebar text-sm text-sidebar-foreground hover:bg-sidebar-accent/10"
              onClick={() =>
                document.getElementById("notebook-sidebar-upload-input")?.click()
              }
            >
              <Upload className="mr-2 size-4" />
              选择文件
            </Button>

            {uploadFiles.length > 0 && (
              <div className="rounded-xl border border-sidebar-border/70 bg-sidebar px-3 py-3">
                <ul className="space-y-1 text-xs leading-5 text-sidebar-foreground/65">
                  {uploadFiles.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`} className="truncate">
                      {file.name}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 h-8 w-full rounded-lg bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
                  onClick={() => void handleUpload()}
                  disabled={uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "上传中…" : "上传"}
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 pr-1">
              {docsLoading && (
                <p className="px-2 py-4 text-xs text-sidebar-foreground/55">
                  正在加载资料…
                </p>
              )}

              {!docsLoading && (!documents || documents.length === 0) && (
                <div className="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-8 text-center text-xs leading-6 text-sidebar-foreground/55">
                  还没有上传资料。
                  <br />
                  支持 PDF、Office、文本与 Markdown 文件。
                </div>
              )}

              {documents?.map((doc) => (
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
  return (
    <div className="rounded-xl border border-sidebar-border/70 bg-sidebar px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="bg-sidebar-accent/10 text-sidebar-accent mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-5 text-sidebar-foreground">
            {doc.title}
          </p>
          <p className="mt-1 text-[11px] text-sidebar-foreground/55">
            {formatDistanceToNow(new Date(doc.created_at * 1000), {
              addSuffix: true,
              locale: dateLocale,
            })}{" "}
            · {doc.status}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-sidebar-foreground/55 hover:bg-destructive/10 hover:text-destructive"
          title="删除资料"
          onClick={() => {
            if (confirm("确定删除这份资料？")) onDelete();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
