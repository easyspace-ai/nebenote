"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocuments } from "@/core/notebook/hooks";
import { cn } from "@/lib/utils";

interface DocumentMentionProps {
  notebookId: string;
  onSelectDocument: (doc: { id: string; title: string; display: string }) => void;
  triggerChar?: string;
}

export function NotebookDocumentMention({
  notebookId,
  onSelectDocument,
  triggerChar = "@",
}: DocumentMentionProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: documents, isLoading } = useDocuments(notebookId);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (!searchValue) return documents.filter((d) => d.status === "ready");
    return documents.filter(
      (d) =>
        d.status === "ready" &&
        (d.title.toLowerCase().includes(searchValue.toLowerCase()) ||
          d.original_filename.toLowerCase().includes(searchValue.toLowerCase()))
    );
  }, [documents, searchValue]);

  const handleSelect = useCallback(
    (doc: any) => {
      onSelectDocument({
        id: doc.doc_id,
        title: doc.title,
        display: `@[${doc.title}](doc_${doc.doc_id})`,
      });
      setOpen(false);
      setSearchValue("");
    },
    [onSelectDocument]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="h-8 px-2"
        >
          <FileText className="h-4 w-4 mr-1" />
          <span className="text-xs">Insert Document</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search documents..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </div>
              ) : (
                "No ready documents found"
              )}
            </CommandEmpty>
            <CommandGroup heading="Documents">
              {filteredDocuments.map((doc) => (
                <DocumentOption
                  key={doc.doc_id}
                  document={doc}
                  onSelect={() => handleSelect(doc)}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface DocumentOptionProps {
  document: any;
  onSelect: () => void;
}

function DocumentOption({ document, onSelect }: DocumentOptionProps) {
  return (
    <CommandItem
      key={document.doc_id}
      value={document.doc_id}
      onSelect={onSelect}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium line-clamp-1">{document.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {document.original_filename}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="flex-shrink-0 ml-2">
        {(document.file_size / 1024).toFixed(1)} KB
      </Badge>
    </CommandItem>
  );
}

// Hook for detecting @ in textarea and showing mention popup
export function useDocumentMentionPopup(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  notebookId: string,
  onInsertMention: (display: string) => void
) {
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [searchText, setSearchText] = useState("");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "@") {
        // Show popup after @ is typed
        const textarea = textareaRef.current;
        if (!textarea) return;

        const rect = textarea.getBoundingClientRect();
        // This is a simplified position calculation
        setPopupPosition({ x: 0, y: rect.height + 10 });
        setShowPopup(true);
        setSearchText("");
      } else if (e.key === "Escape" && showPopup) {
        setShowPopup(false);
      }
    },
    [textareaRef, showPopup]
  );

  const handleSelectDocument = useCallback(
    (doc: { id: string; title: string; display: string }) => {
      onInsertMention(doc.display);
      setShowPopup(false);
    },
    [onInsertMention]
  );

  return {
    showPopup,
    setShowPopup,
    popupPosition,
    searchText,
    setSearchText,
    handleKeyDown,
    handleSelectDocument,
  };
}
