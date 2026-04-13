"use client";

import { GripVerticalIcon } from "lucide-react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface PanelState {
  leftOpen: boolean;
  rightOpen: boolean;
  leftSize: number;
  rightSize: number;
}

interface NotebookLayoutContextType extends PanelState {
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftSize: (size: number) => void;
  setRightSize: (size: number) => void;
}

const STORAGE_KEY = "notebook-layout-state";
const DEFAULT_STATE: PanelState = {
  leftOpen: true,
  rightOpen: true,
  leftSize: 22,
  rightSize: 24,
};
const LEFT_MIN = 16;
const LEFT_MAX = 40;
const RIGHT_MIN = 18;
const RIGHT_MAX = 40;
const CENTER_MIN = 28;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parsePanelPercentage(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (
    value &&
    typeof value === "object" &&
    "asPercentage" in value &&
    typeof (value as { asPercentage: unknown }).asPercentage === "number"
  ) {
    const percentage = (value as { asPercentage: number }).asPercentage;
    return Number.isFinite(percentage) ? percentage : null;
  }
  return null;
}

const NotebookLayoutContext = createContext<NotebookLayoutContextType | null>(null);

export function useNotebookLayout() {
  const context = useContext(NotebookLayoutContext);
  if (!context) {
    throw new Error("useNotebookLayout must be used within NotebookLayoutProvider");
  }
  return context;
}

interface NotebookLayoutProps {
  children: React.ReactNode;
  notebookId: string;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  topBar?: React.ReactNode;
}

export function NotebookLayout({
  children,
  notebookId,
  leftPanel,
  rightPanel,
  topBar,
}: NotebookLayoutProps) {
  const [state, setState] = useState<PanelState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-${notebookId}`);
      if (saved) {
        const parsed = JSON.parse(saved) as PanelState;
        const nextLeftSize = Number.isFinite(parsed.leftSize)
          ? clamp(parsed.leftSize, LEFT_MIN, LEFT_MAX)
          : DEFAULT_STATE.leftSize;
        const nextRightSize = Number.isFinite(parsed.rightSize)
          ? clamp(parsed.rightSize, RIGHT_MIN, RIGHT_MAX)
          : DEFAULT_STATE.rightSize;
        setState((prev) => ({
          ...prev,
          ...parsed,
          leftSize: nextLeftSize,
          rightSize: nextRightSize,
        }));
      }
    } catch {
      // Ignore localStorage errors
    }
    setMounted(true);
  }, [notebookId]);

  // Save state to localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}-${notebookId}`, JSON.stringify(state));
    } catch {
      // Ignore localStorage errors
    }
  }, [state, notebookId, mounted]);

  const toggleLeft = useCallback(() => {
    setState((prev) => {
      if (prev.leftOpen) {
        // Closing: remember current size before closing
        return { ...prev, leftOpen: false };
      } else {
        // Opening: restore to default size if size is 0
        const nextSize = prev.leftSize <= 0 ? DEFAULT_STATE.leftSize : prev.leftSize;
        return { ...prev, leftOpen: true, leftSize: nextSize };
      }
    });
  }, []);

  const toggleRight = useCallback(() => {
    setState((prev) => {
      if (prev.rightOpen) {
        // Closing: remember current size before closing
        return { ...prev, rightOpen: false };
      } else {
        // Opening: restore to default size if size is 0
        const nextSize = prev.rightSize <= 0 ? DEFAULT_STATE.rightSize : prev.rightSize;
        return { ...prev, rightOpen: true, rightSize: nextSize };
      }
    });
  }, []);

  const setLeftSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, leftSize: size }));
  }, []);

  const setRightSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, rightSize: size }));
  }, []);

  const contextValue: NotebookLayoutContextType = {
    ...state,
    toggleLeft,
    toggleRight,
    setLeftSize,
    setRightSize,
  };

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Calculate percentages
  // Left and right each get their configured size if open, plus space for the two resize handles
  const leftPercentage = state.leftOpen ? state.leftSize : 0;
  const rightPercentage = state.rightOpen ? state.rightSize : 0;
  const centerPercentage = 100 - leftPercentage - rightPercentage;

  return (
    <NotebookLayoutContext.Provider value={contextValue}>
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        {topBar && <div className="shrink-0">{topBar}</div>}
        <div className="flex min-h-0 flex-1">
          <ResizablePanelGroup
            orientation="horizontal"
            className="flex min-h-0 min-w-0 flex-1 gap-0"
          >
            {/* Left Panel */}
            {state.leftOpen && (
              <ResizablePanel
                id="left-panel"
                defaultSize={`${leftPercentage}%`}
                minSize={`${LEFT_MIN}%`}
                maxSize={`${LEFT_MAX}%`}
                onResize={(panelSize) => {
                  const percentage = parsePanelPercentage(panelSize);
                  if (percentage == null) return;
                  setLeftSize(clamp(percentage, LEFT_MIN, LEFT_MAX));
                }}
              >
                <div className="flex h-full min-w-0 flex-col border-r border-border bg-sidebar">
                  {leftPanel}
                </div>
              </ResizablePanel>
            )}
            {state.leftOpen && (
              <ResizableHandle
                className={cn(
                   "group relative flex w-2 items-center justify-center bg-transparent transition-colors hover:bg-muted/50 data-[dragging=true]:bg-muted/70",
                  )}
                >
                  <div className="z-10 flex h-12 w-2 items-center justify-center rounded-full border border-border/60 bg-background opacity-0 shadow-xs transition-opacity group-hover:opacity-100 group-data-[dragging=true]:opacity-100">
                    <GripVerticalIcon className="size-2.5 text-muted-foreground" />
                  </div>
                </ResizableHandle>
              )}

            {/* Center Panel */}
            <ResizablePanel
              id="center-panel"
              defaultSize={`${centerPercentage}%`}
              minSize={`${CENTER_MIN}%`}
            >
              <div className="flex h-full min-w-0 flex-col overflow-hidden bg-transparent">
                {children}
              </div>
            </ResizablePanel>

            {/* Right Panel */}
            {state.rightOpen && (
              <ResizableHandle
                className={cn(
                  "group relative flex w-2 items-center justify-center bg-transparent transition-colors hover:bg-muted/50 data-[dragging=true]:bg-muted/70",
                )}
              >
                <div className="z-10 flex h-12 w-2 items-center justify-center rounded-full border border-border/60 bg-background opacity-0 shadow-xs transition-opacity group-hover:opacity-100 group-data-[dragging=true]:opacity-100">
                  <GripVerticalIcon className="size-2.5 text-muted-foreground" />
                </div>
              </ResizableHandle>
            )}
            {state.rightOpen && (
              <ResizablePanel
                id="right-panel"
                defaultSize={`${rightPercentage}%`}
                minSize={`${RIGHT_MIN}%`}
                maxSize={`${RIGHT_MAX}%`}
                onResize={(panelSize) => {
                  const percentage = parsePanelPercentage(panelSize);
                  if (percentage == null) return;
                  setRightSize(clamp(percentage, RIGHT_MIN, RIGHT_MAX));
                }}
              >
                <div className="flex h-full min-w-0 flex-col border-l border-border bg-sidebar">
                  {rightPanel}
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </NotebookLayoutContext.Provider>
  );
}
