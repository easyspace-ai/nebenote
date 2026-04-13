"use client";

import { AtSignIcon, FileTextIcon } from "lucide-react";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDocuments, useNotebook } from "@/core/notebook/hooks";
import type { Document } from "@/core/notebook/types";
import { cn } from "@/lib/utils";

interface NotebookDocumentMentionProps {
  onSelectDocument: (doc: Document, notebookId: string) => void;
  notebookId?: string;
  disabled?: boolean;
}

export function NotebookDocumentMention({
  onSelectDocument,
  notebookId,
  disabled,
}: NotebookDocumentMentionProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: notebook } = useNotebook(notebookId);
  const { data: documents, isLoading: isLoadingDocuments } = useDocuments(notebookId);

  // Filter documents based on search
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!search.trim()) return documents;

    const searchLower = search.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.original_filename.toLowerCase().includes(searchLower)
    );
  }, [documents, search]);

  const handleSelect = useCallback(
    (doc: Document) => {
      if (notebookId) {
        onSelectDocument(doc, notebookId);
      }
      setOpen(false);
      setSearch("");
    },
    [notebookId, onSelectDocument]
  );

  // Reset search when opening
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={disabled ?? !notebookId}
        className="hover:bg-accent/50"
        onClick={() => setOpen(true)}
      >
        <AtSignIcon className="size-4" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="选择文档"
        description="搜索并选择要提及的文档"
      >
        <CommandInput
          ref={inputRef}
          placeholder="搜索文档..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {isLoadingDocuments ? "加载中..." : "未找到文档"}
          </CommandEmpty>
          {notebookId && (
            <CommandGroup heading={`笔记本: ${notebook?.title ?? "当前笔记本"}`}>
              {filteredDocuments.map((doc) => (
                <CommandItem
                  key={doc.doc_id}
                  value={doc.doc_id}
                  onSelect={() => handleSelect(doc)}
                  className="cursor-pointer data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                >
                  <FileTextIcon className="mr-2 size-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{doc.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.original_filename}
                    </p>
                  </div>
                  <BadgeForStatus status={doc.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function BadgeForStatus({ status }: { status: string }) {
  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    processing: "secondary",
    ready: "default",
    failed: "destructive",
  };

  const variant = statusVariants[status] ?? "outline";

  return (
    <Badge variant={variant} className="ml-2 flex items-center gap-1 text-xs">
      <span
        className={cn("h-2 w-2 rounded-full", {
          "bg-yellow-500": status === "pending",
          "bg-blue-500": status === "processing",
          "bg-green-500": status === "ready",
          "bg-red-500": status === "failed",
          "bg-gray-500": !["pending", "processing", "ready", "failed"].includes(status),
        })}
      />
      {status}
    </Badge>
  );
}
