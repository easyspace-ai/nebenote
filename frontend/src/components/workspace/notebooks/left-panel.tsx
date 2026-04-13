"use client";

import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import {
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { setLastNotebookThread } from "@/core/notebook/session";
import type { Document } from "@/core/notebook/types";
import { cn } from "@/lib/utils";

import { useNotebookLayout } from "./notebook-layout";

interface LeftPanelProps {
  notebookId: string;
}

export function LeftPanel({ notebookId }: LeftPanelProps) {
  const { leftOpen, toggleLeft } = useNotebookLayout();
  const router = useRouter();

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId);
  const { data: documents, isLoading: docsLoading } = useDocuments(notebookId);
  const uploadDocument = useUploadDocument(notebookId);
  const createThread = useCreateThread(notebookId);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const handleNewChat = useCallback(async () => {
    try {
      const result = await createThread.mutateAsync("新对话");
      setLastNotebookThread(notebookId, result.thread_id);
      router.push(`/workspace/notebooks/${notebookId}/chats/${result.thread_id}`);
    } catch (e) {
      console.error(e);
    }
  }, [createThread, notebookId, router]);

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

  if (!leftOpen) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 px-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="truncate text-sm font-medium">
            {notebookLoading ? "..." : (notebook?.title ?? "Untitled")}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => router.push("/notebooks")}
            title="Back to notebooks"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleLeft}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="sources" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid h-10 grid-cols-2 rounded-lg border border-border/70 bg-transparent p-0">
          <TabsTrigger value="sources" className="rounded-none text-base font-semibold">
            资料
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-none text-base font-semibold">
            对话
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-0 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col gap-2 px-3 py-2">
            <input
              id="upload-input"
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-10 w-full gap-1.5 rounded-xl border border-border/60 bg-background text-sm"
              onClick={() => document.getElementById("upload-input")?.click()}
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
                  className="h-7 text-xs"
                  onClick={() => void handleUpload()}
                  disabled={uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "上传中..." : "确认上传"}
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
            {docsLoading && (
              <p className="text-muted-foreground px-2 py-4 text-xs">加载文档...</p>
            )}
            {!docsLoading && (!documents || documents.length === 0) && (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                暂无资料
                <br />
                支持 PDF、Office 与文本文件
              </p>
            )}
            <ul className="space-y-1">
              {documents?.map((doc) => (
                <DocumentRow key={doc.doc_id} doc={doc} notebookId={notebookId} />
              ))}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 py-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              对话历史
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
            <ThreadList notebookId={notebookId} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DocumentRow({ doc, notebookId }: { doc: Document; notebookId: string }) {
  const { locale } = useI18n();
  const dateLocale = locale === "zh-CN" ? zhCN : enUS;
  const deleteDocument = useDeleteDocument(notebookId);

  return (
    <li className="group flex items-start gap-3 rounded-3xl border border-border/60 bg-background p-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-base font-semibold leading-snug">{doc.title}</p>
        <p className="text-muted-foreground mt-1 text-xs">
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
        className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        title="删除"
        onClick={() => {
          if (confirm("确定删除该文档？")) deleteDocument.mutate(doc.doc_id);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

function ThreadList({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ threadId?: string }>();
  const threadIdFromRoute = params.threadId;
  const pathSegments = pathname.split("/").filter(Boolean);
  const chatsIdx = pathSegments.lastIndexOf("chats");
  const isChatsRoot = chatsIdx >= 0 && chatsIdx === pathSegments.length - 1;

  const { data: notebook, isLoading } = useNotebook(notebookId);

  const threadIds = notebook?.thread_ids ?? [];

  const goToThread = (threadId: string) => {
    setLastNotebookThread(notebookId, threadId);
    router.push(`/workspace/notebooks/${notebookId}/chats/${threadId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-1 px-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      <li>
        <button
          type="button"
          onClick={() => router.push(`/workspace/notebooks/${notebookId}/chats`)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
            isChatsRoot
              ? "bg-accent/10 text-foreground font-medium"
              : "hover:bg-muted/40 text-muted-foreground"
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
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors group",
                  active
                    ? "bg-accent/10 text-foreground font-medium"
                    : "hover:bg-muted/40 text-muted-foreground"
                )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-80" />
              <span className="min-w-0 flex-1 truncate">对话 · {tid.slice(0, 8)}</span>
              {active && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive">删除对话</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </button>
          </li>
        );
      })}
      {!isLoading && threadIds.length === 0 && (
        <li className="text-muted-foreground px-2 py-6 text-center text-xs">
          暂无会话，点击「新对话」开始。
        </li>
      )}
    </ul>
  );
}
