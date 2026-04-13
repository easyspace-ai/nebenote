"use client";

import { Lightbulb, LogOut, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { Notebook } from "@/lib/api/client";
import { notebookTileFromNotebook } from "@/lib/notebookAppearance";
import { cn } from "@/lib/utils";

function navRowClass(isActive: boolean) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

function newNotebookButtonClass() {
  return "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors";
}

export function DashboardShell({
  notebooks,
  isLoading,
  error,
  onOpenCreateNotebook,
  onSearchNavClick,
  children,
}: {
  notebooks: Notebook[];
  isLoading: boolean;
  error: Error | null;
  onOpenCreateNotebook: () => void;
  onSearchNavClick: () => void;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const sorted = useMemo(() => {
    return [...notebooks].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [notebooks]);

  const activeNotebooks = useMemo(
    () => sorted.filter((n) => !n.settings?.archived),
    [sorted]
  );

  const recentSidebar = useMemo(() => activeNotebooks, [activeNotebooks]);

  const isSearchActive = pathname === "/notebooks";
  const isNotebooksNav =
    pathname === "/notebooks" || /^\/workspace\/notebooks\/.+/.test(pathname);
  const isSkillsActive = pathname === "/skills";

  const displayName = user?.email?.split("@")[0] ?? "用户";

  return (
    <div className="bg-background text-foreground flex h-dvh w-full min-h-0 overflow-hidden">
      <aside className="border-sidebar-border bg-sidebar flex w-[252px] shrink-0 flex-col border-r">
        <div className="border-sidebar-border flex h-[52px] shrink-0 items-center justify-between gap-2 border-b px-4">
          <Link href="/notebooks" className="flex min-w-0 flex-1 items-center gap-3" title="MetaNote">
            <img
              src="/logo.jpg"
              alt=""
              className="h-10 w-10 shrink-0 rounded-full bg-white object-cover ring-1 ring-black/[0.06]"
            />
            <span className="truncate text-lg font-bold tracking-tight text-foreground">MetaNote</span>
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pt-3 pb-2">
          <div className="flex shrink-0 flex-col gap-0.5">
            <button type="button" onClick={onOpenCreateNotebook} className={newNotebookButtonClass()}>
              <Plus className="h-4 w-4 shrink-0 opacity-90" />
              <span>新建笔记本</span>
            </button>
            <Link
              href="/notebooks"
              className={navRowClass(isSearchActive)}
              onClick={() => onSearchNavClick()}
            >
              <Search className="h-4 w-4 shrink-0 opacity-90" />
              <span>搜索</span>
            </Link>
            <Link href="/notebooks" className={navRowClass(isNotebooksNav && pathname !== "/")}>
              <Package className="h-4 w-4 shrink-0 opacity-90" />
              <span>笔记本</span>
            </Link>
            {/* <Link href="/skills" className={navRowClass(isSkillsActive)}>
              <Lightbulb className="h-4 w-4 shrink-0 opacity-90" />
              <span>技能</span>
            </Link> */}
          </div>

          <div className="border-sidebar-border/40 mt-4 flex min-h-0 flex-1 flex-col border-t pt-4">
            <div className="scrollbar-stable min-h-0 flex-1 overflow-y-auto pr-1">
              {isLoading && (
                <p className="text-muted-foreground px-2 py-2 text-xs">加载中…</p>
              )}
              {error && (
                <p className="text-destructive px-2 py-2 text-xs">笔记本列表加载失败</p>
              )}
              <p className="text-muted-foreground shrink-0 px-2 text-[11px] font-semibold tracking-wide uppercase">
                近期笔记本
              </p>
              <ul className="mt-2 space-y-0.5 pb-2">
                {recentSidebar.map((n) => {
                  const tile = notebookTileFromNotebook(n);
                  const TileIcon = tile.Icon;
                  const studioPrefix = `/workspace/notebooks/${n.notebook_id}`;
                  const active =
                    pathname === studioPrefix ||
                    pathname.startsWith(`${studioPrefix}/`);
                  return (
                    <li key={n.notebook_id}>
                      <Link
                        href={`${studioPrefix}/chats`}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                          active
                            ? "bg-muted font-medium text-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                            tile.bgClass
                          )}
                          style={tile.tileStyle}
                        >
                          <TileIcon className="h-4 w-4 opacity-95" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {!isLoading && !error && activeNotebooks.length === 0 && (
                <p className="text-muted-foreground px-2 py-2 text-xs">
                  暂无笔记本，点「新建笔记本」即可创建。
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-sidebar-border shrink-0 border-t p-3">
          {user ? (
            <div className="group hover:bg-sidebar-accent flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200/80 bg-gray-100">
                  <span className="text-sm font-semibold text-gray-600">
                    {(displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight text-foreground">
                    {displayName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-muted-foreground hover:bg-red-500/10 hover:text-red-600 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                title="退出"
              >
                <LogOut className="h-[15px] w-[15px]" />
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l">
        {children}
      </main>
    </div>
  );
}
