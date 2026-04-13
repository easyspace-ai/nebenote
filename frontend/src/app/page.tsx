"use client";

import { Archive, ChevronRight, Home, LayoutGrid, List, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Notebook } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/formatTime";
import { notebookTileFromNotebook } from "@/lib/notebookAppearance";
import { cn } from "@/lib/utils";

// Import hooks for notebook operations
import { useNotebooks, useCreateNotebook, useUpdateNotebook, useDeleteNotebook } from "@/core/notebook/hooks";

export default function HomePage() {
  // Notebook data
  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebook = useCreateNotebook();
  const updateNotebook = useUpdateNotebook("");
  const deleteNotebook = useDeleteNotebook();

  // View state
  const [viewArchived, setViewArchived] = useState(false);
  const [gridMode, setGridMode] = useState(true);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit dialog state
  const [editNotebookState, setEditNotebookState] = useState<Notebook | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Delete dialog state
  const [deleteNotebookState, setDeleteNotebookState] = useState<Notebook | null>(null);

  const sorted = useMemo(() => {
    if (!notebooks) return [];
    return [...notebooks].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [notebooks]);

  const visible = useMemo(() => {
    if (viewArchived) return sorted.filter((n) => n.settings?.archived);
    return sorted.filter((n) => !n.settings?.archived);
  }, [sorted, viewArchived]);

  const recentChips = useMemo(
    () => sorted.filter((n) => !n.settings?.archived).slice(0, 12),
    [sorted]
  );

  // Handlers
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createNotebook.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setIsCreateOpen(false);
      setNewTitle("");
      setNewDescription("");
    } catch (error) {
      console.error("Failed to create notebook:", error);
    }
  };

  const handleEdit = async () => {
    if (!editNotebookState || !editTitle.trim()) return;
    try {
      await updateNotebook.mutateAsync({
        title: editTitle.trim(),
      });
      setEditNotebookState(null);
      setEditTitle("");
    } catch (error) {
      console.error("Failed to update notebook:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteNotebookState) return;
    try {
      await deleteNotebook.mutateAsync(deleteNotebookState.notebook_id);
      setDeleteNotebookState(null);
    } catch (error) {
      console.error("Failed to delete notebook:", error);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* Header */}
      <header className="border-border/50 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="text-foreground text-lg font-bold tracking-tight">笔记本</h1>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            首页
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="bg-muted text-foreground hover:bg-muted/80 inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建笔记本
        </button>
      </header>

      {/* Main Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {/* Recent Section */}
        {recentChips.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold">最近</h2>
            </div>
            <div className="scrollbar-stable flex gap-2 overflow-x-auto pb-1">
              {recentChips.map((n) => {
                const tile = notebookTileFromNotebook(n);
                const Icon = tile.Icon;
                return (
                  <Link
                    key={n.notebook_id}
                    href={`/workspace/notebooks/${n.notebook_id}/chats`}
                    className="border-black/[0.08] hover:border-foreground/20 flex min-w-[140px] max-w-[180px] shrink-0 flex-col gap-2 rounded-2xl border bg-white p-3 shadow-sm transition-colors"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm",
                        tile.bgClass
                      )}
                      style={tile.tileStyle}
                    >
                      <Icon className="h-5 w-5 opacity-95" strokeWidth={2} />
                    </span>
                    <p className="text-foreground line-clamp-2 text-xs font-medium leading-snug">
                      {n.title}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {formatRelativeTime(n.updated_at)}
                    </p>
                  </Link>
                );
              })}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex h-[118px] w-10 shrink-0 items-center justify-center rounded-xl border border-dashed bg-white"
                aria-label="更多"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </section>
        )}

        {/* Notebooks List Section */}
        <section>
          {/* Tabs and View Toggle */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl bg-black/[0.04] p-1">
              <button
                type="button"
                onClick={() => setViewArchived(false)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  !viewArchived ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                活跃中
              </button>
              <button
                type="button"
                onClick={() => setViewArchived(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  viewArchived ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <Archive className="h-3.5 w-3.5" />
                已归档
              </button>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] p-0.5">
              <button
                type="button"
                title="网格"
                onClick={() => setGridMode(true)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  gridMode ? "bg-black/[0.07] text-foreground" : "text-muted-foreground hover:bg-black/[0.04]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="列表"
                onClick={() => setGridMode(false)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  !gridMode ? "bg-black/[0.07] text-foreground" : "text-muted-foreground hover:bg-black/[0.04]"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={cn(
              "gap-4",
              gridMode ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col"
            )}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && visible.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/[0.12] bg-black/[0.02] px-6 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                {viewArchived ? "暂无已归档笔记本" : "暂未创建笔记本，点击右上角「新建笔记本」开始"}
              </p>
            </div>
          )}

          {/* Grid View */}
          {!isLoading && visible.length > 0 && gridMode && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((n) => (
                <NotebookGridCard
                  key={n.notebook_id}
                  notebook={n}
                  onEdit={() => {
                    setEditNotebookState(n);
                    setEditTitle(n.title);
                  }}
                  onDelete={() => setDeleteNotebookState(n)}
                />
              ))}
            </ul>
          )}

          {/* List View */}
          {!isLoading && visible.length > 0 && !gridMode && (
            <ul className="space-y-1">
              {visible.map((n) => (
                <NotebookListRow
                  key={n.notebook_id}
                  notebook={n}
                  onEdit={() => {
                    setEditNotebookState(n);
                    setEditTitle(n.title);
                  }}
                  onDelete={() => setDeleteNotebookState(n)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建笔记本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input
                placeholder="输入笔记本名称"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述（可选）</label>
              <Textarea
                placeholder="输入笔记本描述..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createNotebook.isPending}
            >
              {createNotebook.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editNotebookState} onOpenChange={(open) => !open && setEditNotebookState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑笔记本</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="笔记本名称"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditNotebookState(null)}>
              取消
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editTitle.trim() || updateNotebook.isPending}
            >
              {updateNotebook.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteNotebookState} onOpenChange={(open) => !open && setDeleteNotebookState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除笔记本</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm py-4">
            确定要删除笔记本「{deleteNotebookState?.title}」吗？此操作不可恢复。
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteNotebookState(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNotebook.isPending}
            >
              {deleteNotebook.isPending ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Notebook Grid Card Component
function NotebookGridCard({
  notebook: n,
  onEdit,
  onDelete,
}: {
  notebook: Notebook;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tile = notebookTileFromNotebook(n);
  const Icon = tile.Icon;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <li className="relative">
      <div
        className={cn(
          "group border-border/50 flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
          n.settings?.archived && "opacity-80"
        )}
      >
        <Link
          href={`/workspace/notebooks/${n.notebook_id}/chats`}
          className="flex min-h-[160px] flex-1 flex-col p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm",
                tile.bgClass
              )}
              style={tile.tileStyle}
            >
              <Icon className="h-5 w-5 opacity-95" strokeWidth={2} />
            </span>
          </div>
          <h3 className="text-foreground line-clamp-2 text-sm font-semibold leading-snug">{n.title}</h3>
          <p className="text-muted-foreground mt-2 text-xs">{formatRelativeTime(n.updated_at)}</p>
          {n.description?.trim() ? (
            <p className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed">{n.description}</p>
          ) : (
            <div className="mt-3 flex flex-1 flex-wrap gap-1 opacity-40">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-muted h-7 w-14 rounded-md" />
              ))}
            </div>
          )}
        </Link>

        {/* Edit/Delete Menu */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="bg-white/90 hover:bg-white rounded-lg p-1.5 shadow-sm border border-black/[0.08]"
            >
              <span className="text-xs font-medium text-gray-600">···</span>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-black/[0.08] bg-white p-1 shadow-lg">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// Notebook List Row Component
function NotebookListRow({
  notebook: n,
  onEdit,
  onDelete,
}: {
  notebook: Notebook;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tile = notebookTileFromNotebook(n);
  const Icon = tile.Icon;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <li className="relative">
      <div className="group hover:bg-black/[0.03] flex items-center gap-2 rounded-xl pr-1 transition-colors">
        <Link
          href={`/workspace/notebooks/${n.notebook_id}/chats`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
              tile.bgClass
            )}
            style={tile.tileStyle}
          >
            <Icon className="h-[18px] w-[18px] opacity-95" strokeWidth={2} />
          </span>
          <span className="text-foreground min-w-0 flex-1 truncate font-medium">{n.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatRelativeTime(n.updated_at)}
          </span>
        </Link>

        {/* Edit/Delete Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-lg p-1.5 hover:bg-black/[0.04]"
            >
              <span className="text-xs font-medium text-gray-500">···</span>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-black/[0.08] bg-white p-1 shadow-lg">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
