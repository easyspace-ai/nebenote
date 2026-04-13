"use client";

import {
  FileText,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Upload,
  MoreHorizontal,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateThread,
  useDeleteDocument,
  useDocuments,
  useNotebook,
  useRenameDocument,
  useUploadDocument,
} from "@/core/notebook/hooks";
import { setLastNotebookThread } from "@/core/notebook/session";
import type { Document, DocumentStatus } from "@/core/notebook/types";
import { cn } from "@/lib/utils";

import { useNotebookLayout } from "./notebook-layout";

interface LeftPanelProps {
  notebookId: string;
}

export function LeftPanel({ notebookId }: LeftPanelProps) {
  const { leftOpen } = useNotebookLayout();
  const router = useRouter();

  const {
    data: documents,
    isLoading: docsLoading,
    refetch: refetchDocuments,
  } = useDocuments(notebookId);
  const uploadDocument = useUploadDocument(notebookId);
  const createThread = useCreateThread(notebookId);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [localDocs, setLocalDocs] = useState<Document[]>([]);

  const handleNewChat = useCallback(async () => {
    try {
      const result = await createThread.mutateAsync("新对话");
      setLastNotebookThread(notebookId, result.thread_id);
      router.push(`/workspace/notebooks/${notebookId}/chats/${result.thread_id}`);
    } catch (e) {
      console.error(e);
    }
  }, [createThread, notebookId, router]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    setUploadDialogOpen(false);

    const optimisticDocs = selectedFiles.map((file, idx) => {
      const now = Math.floor(Date.now() / 1000);
      return {
        doc_id: `local-${Date.now()}-${idx}`,
        original_filename: file.name,
        file_type: file.type || "unknown",
        file_size: file.size,
        title: file.name,
        status: "processing" as DocumentStatus,
        created_at: now,
        outline: [],
        stats: {},
      } satisfies Document;
    });

    setLocalDocs((prev) => [...optimisticDocs, ...prev]);

    void (async () => {
      for (const [i, file] of selectedFiles.entries()) {
        const optimisticDoc = optimisticDocs[i];
        if (!optimisticDoc) continue;
        try {
          const result = await uploadDocument.mutateAsync({ file, title: file.name });
          setLocalDocs((prev) =>
            prev.map((doc) => (doc.doc_id === optimisticDoc.doc_id ? result.document : doc))
          );
        } catch (e) {
          console.error(e);
          setLocalDocs((prev) =>
            prev.map((doc) =>
              doc.doc_id === optimisticDoc.doc_id
                ? {
                    ...doc,
                    status: "failed",
                    error_message: "上传失败",
                  }
                : doc
            )
          );
        }
      }
      void refetchDocuments();
    })();
  };

  useEffect(() => {
    if (!documents?.length) return;
    setLocalDocs((prev) =>
      prev.filter((localDoc) => {
        if (localDoc.doc_id.startsWith("local-")) {
          return true;
        }
        return !documents.some((doc) => doc.doc_id === localDoc.doc_id);
      })
    );
  }, [documents]);

  const mergedDocuments = useMemo(() => {
    const docs = [...localDocs, ...(documents ?? [])];
    const seen = new Set<string>();
    return docs.filter((doc) => {
      const filename = doc.original_filename ?? "";
      const title = doc.title ?? "";
      if (filename.startsWith("mnd_") || title.startsWith("mnd_")) {
        return false;
      }
      if (seen.has(doc.doc_id)) return false;
      seen.add(doc.doc_id);
      return true;
    });
  }, [documents, localDocs]);

  useEffect(() => {
    const hasProcessing = mergedDocuments.some(
      (doc) => doc.status === "pending" || doc.status === "processing"
    );
    if (!hasProcessing) return;

    const timer = window.setInterval(() => {
      void refetchDocuments();
    }, 1500);

    return () => window.clearInterval(timer);
  }, [mergedDocuments, refetchDocuments]);

  if (!leftOpen) return null;

  return (
    <Tabs defaultValue="sources" className="flex h-full min-h-0 flex-1 flex-col">
      <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-border/50 px-3">
        <TabsList className="grid h-10 w-[220px] grid-cols-2 rounded-full bg-muted/70 p-1">
          <TabsTrigger
            value="sources"
            className="rounded-full text-sm font-semibold data-[state=active]:bg-background"
          >
            资料
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-full text-sm font-semibold data-[state=active]:bg-background"
          >
            对话
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sources" className="mt-0 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 py-2">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              资料
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="搜索"
                disabled
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="添加资料"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>添加资料</DialogTitle>
              </DialogHeader>
              <div className="py-1">
                <input
                  id="upload-input"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                  onChange={(e) => {
                    handleFileSelect(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  className="border-border/70 hover:bg-muted/40 flex h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed transition-colors"
                  onClick={() => document.getElementById("upload-input")?.click()}
                >
                  <div className="bg-background mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border">
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="text-center text-2xl font-medium">拖拽文件到这里，或点击上传文件</p>
                  <p className="text-muted-foreground mt-3 text-sm">支持 PDF、Office 与文本文件</p>
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3">
            {docsLoading && (
              <p className="text-muted-foreground px-2 py-4 text-xs">加载文档...</p>
            )}
            {!docsLoading && mergedDocuments.length === 0 && (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                暂无资料
                <br />
                支持 PDF、Office 与文本文件
              </p>
            )}
            <ul className="w-full space-y-1">
              {mergedDocuments.map((doc) => (
                <DocumentRow
                  key={doc.doc_id}
                  doc={doc}
                  notebookId={notebookId}
                />
              ))}
            </ul>
          </div>
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
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <ThreadList notebookId={notebookId} />
          </div>
      </TabsContent>
    </Tabs>
  );
}

function DocumentRow({
  doc,
  notebookId,
}: {
  doc: Document;
  notebookId: string;
}) {
  const deleteDocument = useDeleteDocument(notebookId);
  const renameDocument = useRenameDocument(notebookId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(doc.title);
  const isLocalDoc = doc.doc_id.startsWith("local-");
  const isProcessing = doc.status === "pending" || doc.status === "processing";
  const isFailed = doc.status === "failed";

  const statusText: Record<DocumentStatus, string> = {
    pending: "处理中",
    processing: "处理中",
    ready: "",
    failed: "失败",
  };

  return (
    <>
      <li className="group flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
          <FileText className="h-3.5 w-3.5" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p
            className="min-w-0 flex-1 truncate text-sm font-medium"
            title={doc.title}
          >
            {doc.title}
          </p>
          {(isProcessing || isFailed) && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 text-xs",
                isFailed ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {isProcessing && (
                <span className="bg-primary/70 inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
              )}
              {statusText[doc.status] ?? doc.status}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-8 w-8 shrink-0 rounded-xl bg-muted/70 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted hover:text-foreground"
              title="更多"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={isLocalDoc || renameDocument.isPending}
              onClick={() => {
                setRenameValue(doc.title);
                setRenameOpen(true);
              }}
            >
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              disabled={isLocalDoc || deleteDocument.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="输入新名称"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                const nextTitle = renameValue.trim();
                if (!nextTitle || nextTitle === doc.title) {
                  setRenameOpen(false);
                  return;
                }
                void renameDocument
                  .mutateAsync({ docId: doc.doc_id, title: nextTitle })
                  .then(() => setRenameOpen(false));
              }}
              disabled={renameDocument.isPending}
            >
              {renameDocument.isPending ? "保存中..." : "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>删除资料</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">确定删除这份资料吗？</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={isLocalDoc || deleteDocument.isPending}
              onClick={() => {
                void deleteDocument.mutateAsync(doc.doc_id).then(() => setDeleteOpen(false));
              }}
            >
              {deleteDocument.isPending ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ThreadList({ notebookId }: { notebookId: string }) {
  const router = useRouter();
  const params = useParams<{ threadId?: string }>();
  const threadIdFromRoute = params.threadId;

  const { data: notebook, isLoading } = useNotebook(notebookId);

  // thread_ids from backend: [...oldest, newest]
  // Reverse to show newest at TOP
  const threadIds = [...(notebook?.thread_ids ?? [])].reverse();

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
      {threadIds.map((tid) => {
        const active = threadIdFromRoute === tid;
        return (
          <li key={tid}>
            <div
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors group",
                active
                  ? "bg-muted text-foreground font-medium"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <button
                type="button"
                onClick={() => goToThread(tid)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1 truncate">对话 · {tid.slice(0, 8)}</span>
              </button>
              {active && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive">删除对话</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </li>
        );
      })}
      {!isLoading && threadIds.length === 0 && (
        <li className="text-muted-foreground px-2 py-6 text-center text-xs">
          暂无会话，系统将自动创建。
        </li>
      )}
    </ul>
  );
}
