"use client";

import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { t } = useI18n();
  const { state } = useSidebar();
  const pathname = usePathname();
  const params = useParams<{ notebookId?: string }>();
  const isNotebookRoute =
    Boolean(params.notebookId) && pathname.includes("/workspace/notebooks/");
  const newChatHref = isNotebookRoute
    ? `/workspace/notebooks/${params.notebookId}/chats`
    : "/workspace/chats/new";

  return (
    <>
      <div
        className={cn(
          "group/workspace-header flex h-12 flex-col justify-center",
          className,
        )}
      >
        {state === "collapsed" ? (
          <div className="group-has-data-[collapsible=icon]/sidebar-wrapper:-translate-y flex w-full cursor-pointer items-center justify-center">
            <div className="text-primary block pt-1 font-serif group-hover/workspace-header:hidden">
              DF
            </div>
            <SidebarTrigger className="hidden pl-2 group-hover/workspace-header:block" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
              <Link href="/" className="text-primary ml-2 font-heading font-bold tracking-tight text-xl">
                DeerFlow
              </Link>
            ) : (
              <div className="text-primary ml-2 cursor-default font-heading font-bold tracking-tight text-xl">
                DeerFlow
              </div>
            )}
            <SidebarTrigger />
          </div>
        )}
      </div>
      {!isNotebookRoute && (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === newChatHref}
              asChild
              className="transition-colors duration-200 cursor-pointer hover:bg-sidebar-accent"
            >
              <Link className="text-muted-foreground" href={newChatHref}>
                <MessageSquarePlus size={16} />
                <span>{t.sidebar.newChat}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
    </>
  );
}
