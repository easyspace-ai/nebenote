"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useDashboardNotebooks } from "@/hooks/useDashboardNotebooks";

import { CreateNotebookDialog } from "./CreateNotebookDialog";
import { DashboardShell } from "./DashboardShell";
import { WorkspaceHomeContent } from "./WorkspaceHomeContent";

export function DashboardHome() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [searchFocusNonce, setSearchFocusNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const { notebooks, isLoading, error, createNotebook } = useDashboardNotebooks(
    isAuthenticated,
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleCreated = async (input: { title: string; description?: string }) => {
    setCreateBusy(true);
    try {
      const id = await createNotebook(input);
      router.push(`/workspace/notebooks/${id}/chats`);
    } finally {
      setCreateBusy(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <>
      <DashboardShell
        notebooks={notebooks}
        isLoading={isLoading}
        error={error}
        onOpenCreateNotebook={() => setCreateOpen(true)}
        onSearchNavClick={() => setSearchFocusNonce((n) => n + 1)}
      >
        <WorkspaceHomeContent
          notebooks={notebooks}
          isLoading={isLoading}
          error={error}
          searchFocusNonce={searchFocusNonce}
          onOpenCreateNotebook={() => setCreateOpen(true)}
        />
      </DashboardShell>
      <CreateNotebookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreated}
        isSubmitting={createBusy}
      />
    </>
  );
}
