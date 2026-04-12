"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreateNotebookDialog } from "@/components/home/CreateNotebookDialog";
import { DashboardShell } from "@/components/home/DashboardShell";
import { NotebooksListContent } from "@/components/home/NotebooksListContent";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardNotebooks } from "@/hooks/useDashboardNotebooks";

export default function NotebooksIndexPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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
        onSearchNavClick={() => {
          void 0;
        }}
      >
        <NotebooksListContent
          notebooks={notebooks}
          isLoading={isLoading}
          error={error}
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
