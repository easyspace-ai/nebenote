"use client";

import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import {
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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
import { cn } from "@/lib/utils";

export function NotebookStudioLeft({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ threadId?: string }>();
  const threadIdFromRoute = params.threadId;
  const pathSegments = pathname.split("/").filter(Boolean);
  const chatsIdx = pathSegments.lastIndexOf("chats");
  const isChatsRoot = chatsIdx >= 0 && chatsIdx === pathSegments.length - 1;
  const { locale } = useI18n();
  const dateLocale = locale === "zh-CN" ? zhCN : enUS;

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId);
  const { data: documents, isLoading: docsLoading } = useDocuments(notebookId);
  const uploadDocument = useUploadDocument(notebookId);
  const deleteDocument = useDeleteDocument(notebookId);
  const createThread = useCreateThread(notebookId);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const goToThread = useCallback(
    (threadId: string) => {
      router.push(`/workspace/notebooks/${notebookId}/chats/${threadId}`);
    },
    [notebookId, router],
  );

  const handleNewChat = useCallback(async () => {
    try {
      const result = await createThread.mutateAsync("新对话");
      goToThread(result.thread_id);
    } catch (e) {
      console.error(e);
    }
  }, [createThread, goToThread]);

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    try {
      for (const file of uploadFiles) {
        await uploadDocument.mutateAsync({ file, title: file.name });
      }
      setUploadFiles([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;
    setUploadFiles(Array.from(files));
  };

  const threadIds = notebook?.thread_ids ?? [];

  return (
    <div className="border-border/60 bg-muted/20 flex h-full min-h-0 flex-col border-r">
      <div className="border-border/50 shrink-0 border-b px-3 py-3">
        <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
          {notebookLoading ? "…" : notebook?.title ?? ""}
        </p>
      </div>
      <Tabs defaultValue="threads" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="bg-background/80 mx-2 mt-2 grid h-9 w-auto shrink-0 grid-cols-2 rounded-lg p-1">
          <TabsTrigger value="threads" className="text-xs">
            会话历史
          </TabsTrigger>
          <TabsTrigger value="uploads" className="text-xs">
            上传资料
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="threads"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="flex shrink-0 items-center justify-between px-3 py-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              对话
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void handleNewChat()}
              disabled={createThread.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
              新对话
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/workspace/notebooks/${notebookId}/chats`)
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    isChatsRoot
                      ? "bg-accent/15 text-foreground font-medium"
                      : "hover:bg-muted/80 text-muted-foreground",
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="min-w-0 flex-1 truncate">新对话</span>
                </button>
              </li>
              {threadIds.map((tid) => {
                const active = !isChatsRoot && threadIdFromRoute === tid;
                return (
                  <li key={tid}>
                    <button
                      type="button"
                      onClick={() => goToThread(tid)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-accent/15 text-foreground font-medium"
                          : "hover:bg-muted/80 text-muted-foreground",
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="min-w-0 flex-1 truncate">
                        对话 · {tid.slice(0, 8)}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!notebookLoading && threadIds.length === 0 && (
                <li className="text-muted-foreground px-2 py-6 text-center text-xs">
                  暂无会话，点击「新对话」开始。
                </li>
              )}
            </ul>
          </ScrollArea>
        </TabsContent>
        <TabsContent
          value="uploads"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="flex shrink-0 flex-col gap-2 px-3 py-2">
            <input
              id="studio-upload-input"
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs"
              onClick={() => document.getElementById("studio-upload-input")?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              选择文件
            </Button>
            {uploadFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                <ul className="text-muted-foreground max-h-20 space-y-1 overflow-y-auto text-[11px]">
                  {uploadFiles.map((f) => (
                    <li key={f.name} className="truncate">
                      {f.name}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => void handleUpload()}
                  disabled={uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "上传中…" : "上传"}
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
            {docsLoading && (
              <p className="text-muted-foreground px-2 py-4 text-xs">加载文档…</p>
            )}
            {!docsLoading && (!documents || documents.length === 0) && (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                暂无资料。支持 PDF、Office 与文本文件。
              </p>
            )}
            <ul className="space-y-1">
              {documents?.map((doc) => (
                <DocumentRow
                  key={doc.doc_id}
                  doc={doc}
                  dateLocale={dateLocale}
                  onDelete={() => void deleteDocument.mutateAsync(doc.doc_id)}
                />
              ))}
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      <div className="border-border/50 shrink-0 border-t px-3 py-2">
        <Link
          href="/notebooks"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
        >
          ← 笔记本列表
        </Link>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  dateLocale,
  onDelete,
}: {
  doc: Document;
  dateLocale: typeof zhCN;
  onDelete: () => void;
}) {
  return (
    <li className="border-border/40 bg-background/80 flex items-start gap-2 rounded-lg border px-2 py-2">
      <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-medium leading-snug">{doc.title}</p>
        <p className="text-muted-foreground mt-0.5 text-[10px]">
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
        className="shrink-0"
        title="删除"
        onClick={() => {
          if (confirm("确定删除该文档？")) onDelete();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}
