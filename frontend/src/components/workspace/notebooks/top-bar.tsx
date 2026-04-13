"use client";

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useNotebookLayout } from "./notebook-layout";

interface TopBarProps {
  notebookId: string;
  notebookTitle?: string;
}

export function TopBar({ notebookId: _notebookId, notebookTitle }: TopBarProps) {
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = useNotebookLayout();

  return (
    <TooltipProvider delayDuration={200}>
      <header className="z-40 flex h-12 items-center justify-between border-b border-border/50 bg-background px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 transition-colors",
                  leftOpen && "bg-muted text-foreground"
                )}
                onClick={toggleLeft}
              >
                {leftOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{leftOpen ? "隐藏侧边栏" : "显示侧边栏"}</p>
            </TooltipContent>
          </Tooltip>

          <div className="mx-1 h-4 w-px shrink-0 bg-border/70" />
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/notebooks"
              className="mr-2 flex shrink-0 items-center gap-2 rounded-lg"
            >
              <Image
                src="/logo.jpg"
                alt=""
                width={24}
                height={24}
                className="rounded-full ring-1 ring-border/60"
              />
              <span className="hidden text-sm font-semibold tracking-tight sm:inline">MetaNote</span>
            </Link>
            {notebookTitle && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span
                  className="max-w-[180px] truncate text-sm text-muted-foreground"
                  title={notebookTitle}
                >
                  {notebookTitle}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 transition-colors",
                  rightOpen && "bg-muted text-foreground",
                )}
                onClick={toggleRight}
              >
                {rightOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{rightOpen ? "隐藏 Studio" : "显示 Studio"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
