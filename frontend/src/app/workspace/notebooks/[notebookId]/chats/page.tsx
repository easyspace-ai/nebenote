"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCreateThread, useNotebook } from "@/core/notebook/hooks";
import { clearLastNotebookThread, getLastNotebookThread } from "@/core/notebook/session";

export default function NotebookNewChatPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.notebookId as string;
  const { data: notebook, isLoading } = useNotebook(notebookId);
  const createThread = useCreateThread(notebookId);
  const hasCreatedThread = useRef(false);

  useEffect(() => {
    if (isLoading || !notebook) return;
    const threadIds = notebook.thread_ids ?? [];
    if (threadIds.length === 0) {
      // Only create once even if component re-renders
      if (hasCreatedThread.current || createThread.isPending) return;
      hasCreatedThread.current = true;
      void createThread.mutateAsync("新对话").then((result) => {
        router.replace(`/workspace/notebooks/${notebookId}/chats/${result.thread_id}`);
      });
      return;
    }
    let lastThreadId = getLastNotebookThread(notebookId);
    // If last saved thread doesn't exist in the list, it was deleted
    // Clear it and fall back to the first available thread
    if (lastThreadId && !threadIds.includes(lastThreadId)) {
      clearLastNotebookThread(notebookId);
      lastThreadId = null;
    }
    const targetThreadId = lastThreadId ? lastThreadId : threadIds[0];
    router.replace(`/workspace/notebooks/${notebookId}/chats/${targetThreadId}`);
  }, [createThread.isPending, isLoading, notebook, notebookId, router]);

  return null;
}
