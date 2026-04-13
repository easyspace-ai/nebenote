import { ChevronUpIcon, ListTodoIcon } from "lucide-react";
import { useState } from "react";

import type { Todo } from "@/core/todos";
import { cn } from "@/lib/utils";

import {
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
  QueueList,
} from "../ai-elements/queue";

export function TodoList({
  className,
  todos,
  collapsed: controlledCollapsed,
  hidden = false,
  onToggle,
}: {
  className?: string;
  todos: Todo[];
  collapsed?: boolean;
  hidden?: boolean;
  onToggle?: () => void;
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        "flex h-fit w-full origin-bottom translate-y-4 flex-col overflow-hidden rounded-t-lg border border-b-0 bg-background/80 backdrop-blur-sm transition-all duration-200",
        hidden ? "pointer-events-none translate-y-8 opacity-0" : "",
        className,
      )}
    >
      <header
        className={cn(
          "hover:bg-muted/60 bg-muted/40 flex h-7 shrink-0 cursor-pointer items-center justify-between px-3 text-xs transition-colors",
        )}
        onClick={handleToggle}
      >
        <div className="text-muted-foreground/80">
          <div className="flex items-center justify-center gap-1.5">
            <ListTodoIcon className="size-3.5" />
            <span className="font-medium">To-dos</span>
          </div>
        </div>
        <ChevronUpIcon
          className={cn(
            "text-muted-foreground/60 size-3.5 transition-transform duration-200",
            collapsed ? "" : "rotate-180",
          )}
        />
      </header>
      <main
        className={cn(
          "bg-muted/30 flex grow px-2 transition-all duration-200",
          collapsed ? "h-0 pb-2" : "h-24 pb-3",
        )}
      >
        <QueueList className="bg-background mt-0 w-full rounded-t-lg">
          {todos.map((todo, i) => (
            <QueueItem key={i + (todo.content ?? "")}>
              <div className="flex items-center gap-1.5">
                <QueueItemIndicator
                  className={
                    todo.status === "in_progress" ? "bg-foreground/40" : ""
                  }
                  completed={todo.status === "completed"}
                />
                <QueueItemContent
                  className={
                    todo.status === "in_progress" ? "text-foreground/70" : ""
                  }
                  completed={todo.status === "completed"}
                >
                  {todo.content}
                </QueueItemContent>
              </div>
            </QueueItem>
          ))}
        </QueueList>
      </main>
    </div>
  );
}
