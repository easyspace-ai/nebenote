"use client";

import { SubtasksProvider } from "@/core/tasks/context";

export default function NotebookChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubtasksProvider>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </SubtasksProvider>
  );
}
