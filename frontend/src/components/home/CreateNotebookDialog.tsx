"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateNotebookDialog({
  open,
  onOpenChange,
  onCreate,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { title: string; description?: string }) => Promise<void>;
  isSubmitting?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleClose = (next: boolean) => {
    if (!next) {
      setTitle("");
      setDescription("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) return;
    await onCreate({ title: t, description: description.trim() || undefined });
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-black/[0.08] bg-[#faf8f4] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">新建笔记本</DialogTitle>
          <DialogDescription>
            创建笔记本以整理文档与对话记录。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="nb-title" className="text-sm font-medium">
              标题
            </label>
            <Input
              id="nb-title"
              placeholder="我的研究笔记本"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-accent/40 focus-visible:ring-accent/30"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nb-desc" className="text-sm font-medium">
              描述（可选）
            </label>
            <Textarea
              id="nb-desc"
              placeholder="论文、笔记与资料……"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-y"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="button"
            className="bg-foreground text-background hover:bg-foreground/90"
            onClick={() => void handleSubmit()}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "创建中…" : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
