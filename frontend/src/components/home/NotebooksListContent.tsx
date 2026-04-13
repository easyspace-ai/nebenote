"use client";

import {
  Archive,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Notebook } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/formatTime";
import { notebookTileFromNotebook } from "@/lib/notebookAppearance";
import { cn } from "@/lib/utils";

export function NotebooksListContent({
  notebooks,
  isLoading,
  error,
  onOpenCreateNotebook,
}: {
  notebooks: Notebook[];
  isLoading: boolean;
  error: Error | null;
  onOpenCreateNotebook: () => void;
}) {
  const [viewArchived, setViewArchived] = useState(false);
  const [gridMode, setGridMode] = useState(true);

  const sorted = useMemo(() => {
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <header className="border-border/50 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-4 md:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="text-foreground text-lg font-bold tracking-tight">笔记本</h1>
          <Link
            href="/notebooks"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            首页
          </Link>
        </div>
        <button
          type="button"
          onClick={onOpenCreateNotebook}
          className="bg-muted text-foreground hover:bg-muted/80 inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          新建笔记本
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
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

        <section>
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

          {isLoading && <p className="text-muted-foreground text-sm">加载中…</p>}
          {error && (
            <p className="text-destructive text-sm">无法连接后端，请确认服务已启动。</p>
          )}

          {!isLoading && !error && visible.length === 0 && (
            <div className="text-muted-foreground rounded-2xl border border-dashed border-black/[0.12] bg-black/[0.02] px-6 py-16 text-center text-sm">
              {viewArchived ? "暂无已归档笔记本。" : "暂未创建笔记本，点击右上角「新建笔记本」开始。"}
            </div>
          )}

          {gridMode ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((n) => (
                <NotebookGridCard key={n.notebook_id} notebook={n} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-1">
              {visible.map((n) => (
                <NotebookListRow key={n.notebook_id} notebook={n} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function NotebookGridCard({ notebook: n }: { notebook: Notebook }) {
  const tile = notebookTileFromNotebook(n);
  const Icon = tile.Icon;
  return (
    <li>
      <div
        className={cn(
          "group border-border/50 relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md",
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
      </div>
    </li>
  );
}

function NotebookListRow({ notebook: n }: { notebook: Notebook }) {
  const tile = notebookTileFromNotebook(n);
  const Icon = tile.Icon;
  return (
    <li>
      <div className="hover:bg-black/[0.03] flex items-center gap-2 rounded-xl pr-1 transition-colors">
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
      </div>
    </li>
  );
}
