"use client";

import { useEffect } from "react";

import { useSidebar } from "@/components/ui/sidebar";

export default function NotebookIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setOpen } = useSidebar();

  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
