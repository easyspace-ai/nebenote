"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { NotebookStudioLeft } from "./notebook-studio-left";

const STUDIO_DEFAULT = { "studio-left": 26, "studio-main": 74 };

export function NotebookStudioShell({
  notebookId,
  children,
}: {
  notebookId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <ResizablePanelGroup
        id="notebook-studio-panels"
        orientation="horizontal"
        defaultLayout={STUDIO_DEFAULT}
        className="flex min-h-0 w-full flex-1"
      >
        <ResizablePanel
          id="studio-left"
          defaultSize={26}
          minSize={14}
          maxSize={42}
          className="min-h-0 min-w-0"
        >
          <NotebookStudioLeft notebookId={notebookId} />
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-border/90 hover:bg-accent/40 relative z-20 w-2 max-w-[10px] shrink-0 transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-4 after:-translate-x-1/2"
        />
        <ResizablePanel
          id="studio-main"
          defaultSize={74}
          minSize={38}
          className="min-h-0 min-w-0"
        >
          <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
