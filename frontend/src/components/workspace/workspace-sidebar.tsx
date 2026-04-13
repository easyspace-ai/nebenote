"use client";

import { useParams, usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { NotebookSidebarContent } from "./notebook-sidebar-content";
import { RecentChatList } from "./recent-chat-list";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceNavChatList } from "./workspace-nav-chat-list";
import { WorkspaceNavMenu } from "./workspace-nav-menu";

export function WorkspaceSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { open: isSidebarOpen } = useSidebar();
  const pathname = usePathname();
  const params = useParams<{ notebookId?: string }>();
  const isNotebookPage =
    Boolean(params.notebookId) && pathname.includes("/workspace/notebooks/");

  // On notebook pages with 3-column layout, completely hide the global sidebar
  if (isNotebookPage && !isSidebarOpen) {
    return null;
  }

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon" {...props}>
        <SidebarHeader className="py-0">
          <WorkspaceHeader />
        </SidebarHeader>
        <SidebarContent>
          {!isNotebookPage && <WorkspaceNavChatList />}
          {isSidebarOpen &&
            (isNotebookPage ? (
              <NotebookSidebarContent />
            ) : (
              <RecentChatList />
            ))}
        </SidebarContent>
        <SidebarFooter>
          <WorkspaceNavMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
