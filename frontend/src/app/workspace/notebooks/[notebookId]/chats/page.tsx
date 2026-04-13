"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCreateThread, useNotebook } from "@/core/notebook/hooks";
import { clearLastNotebookThread, getLastNotebookThread } from "@/core/notebook/session";

export default function NotebookNewChatPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.notebookId as string;
  const { data: notebook, isLoading } = useNotebook(notebookId);
  const createThread = useCreateThread(notebookId);

  useEffect(() => {
    if (isLoading || !notebook) return;
    const threadIds = notebook.thread_ids ?? [];
    if (threadIds.length === 0) {
      if (createThread.isPending) return;
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
  }, [createThread, isLoading, notebook, notebookId, router]);

  return null;
}
