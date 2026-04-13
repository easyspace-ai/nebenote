"use client";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import { SubtasksProvider } from "@/core/tasks/context";

export default function NotebookChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubtasksProvider>
      <ArtifactsProvider>
        <PromptInputProvider>
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </PromptInputProvider>
      </ArtifactsProvider>
    </SubtasksProvider>
  );
}
