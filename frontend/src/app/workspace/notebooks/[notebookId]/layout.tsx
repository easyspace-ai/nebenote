"use client";

import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { useSidebar } from "@/components/ui/sidebar";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import { LeftPanel } from "@/components/workspace/notebooks/left-panel";
import { NotebookLayout } from "@/components/workspace/notebooks/notebook-layout";
import { RightPanel } from "@/components/workspace/notebooks/right-panel";
import { TopBar } from "@/components/workspace/notebooks/top-bar";
import { useNotebook } from "@/core/notebook/hooks";

export default function NotebookIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open, setOpen } = useSidebar();
  const params = useParams();
  const notebookId = params.notebookId as string;
  const { data: notebook } = useNotebook(notebookId);

  // Force close the global sidebar - we need full width for notebook 3-column layout
  useLayoutEffect(() => {
    if (open) {
      setOpen(false);
    }
    // Also update the cookie to ensure it stays closed on refresh
    document.cookie = `sidebar_state=false; path=/; max-age=${60 * 60 * 24 * 7}`;
  }, [open, setOpen]);

  useEffect(() => {
    setOpen(false);
    document.cookie = `sidebar_state=false; path=/; max-age=${60 * 60 * 24 * 7}`;
  }, [setOpen, notebookId]);

  return (
    <ArtifactsProvider>
      <PromptInputProvider>
        <NotebookLayout
          notebookId={notebookId}
          leftPanel={<LeftPanel notebookId={notebookId} />}
          rightPanel={<RightPanel notebookId={notebookId} />}
          topBar={<TopBar notebookId={notebookId} notebookTitle={notebook?.title} />}
        >
          {children}
        </NotebookLayout>
      </PromptInputProvider>
    </ArtifactsProvider>
  );
}
