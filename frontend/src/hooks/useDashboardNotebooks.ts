"use client";

import { useCallback, useEffect, useState } from "react";

import { apiClient, type Notebook } from "@/lib/api/client";

export function useDashboardNotebooks(enabled: boolean) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.listNotebooks();
      setNotebooks(response.notebooks);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load notebooks"));
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setNotebooks([]);
      setError(null);
      return;
    }
    void refetch();
  }, [enabled, refetch]);

  const createNotebook = useCallback(
    async (opts?: { title?: string; description?: string }) => {
      const rawTitle = opts?.title?.trim();
      const response = await apiClient.createNotebook({
        title: rawTitle && rawTitle.length > 0 ? rawTitle : "未命名笔记本",
        description: opts?.description?.trim() ?? "",
        tags: [],
      });
      await refetch();
      return response.notebook.notebook_id;
    },
    [refetch],
  );

  return { notebooks, isLoading, error, refetch, createNotebook };
}
