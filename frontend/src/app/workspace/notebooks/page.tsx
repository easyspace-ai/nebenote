"use client";

import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/core/i18n/hooks";
import { useNotebooks, useCreateNotebook } from "@/core/notebook/hooks";

export default function NotebooksPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebook = useCreateNotebook();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const dateLocale = locale === "zh-CN" ? zhCN : enUS;

  const handleCreateNotebook = async () => {
    if (!newTitle.trim()) return;

    try {
      await createNotebook.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setIsDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
    } catch (error) {
      console.error("Failed to create notebook:", error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Notebooks</h1>
          <p className="text-muted-foreground mt-2">
            Organize your documents and conversations in notebooks
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Notebook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Notebook</DialogTitle>
              <DialogDescription>
                Create a notebook to organize your documents and conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  placeholder="My Research Notebook"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Textarea
                  id="description"
                  placeholder="A collection of research papers and notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNotebook}
                disabled={!newTitle.trim() || createNotebook.isPending}
              >
                {createNotebook.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notebooks && notebooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <Card
              key={notebook.notebook_id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() =>
                router.push(`/workspace/notebooks/${notebook.notebook_id}/chats`)
              }
            >
              <CardHeader className="pb-4">
                <CardTitle className="line-clamp-1">{notebook.title}</CardTitle>
                {notebook.description && (
                  <CardDescription className="line-clamp-2">
                    {notebook.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{notebook.documents?.length ?? 0} documents</span>
                  <span>{notebook.thread_ids.length} threads</span>
                </div>
                <div>
                  Updated{" "}
                  {formatDistanceToNow(new Date(notebook.updated_at * 1000), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyTitle>No notebooks yet</EmptyTitle>
          <EmptyDescription>Create your first notebook to get started</EmptyDescription>
        </Empty>
      )}
    </div>
  );
}
