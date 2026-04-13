"use client";

const LAST_THREAD_KEY_PREFIX = "notebook-last-thread";

function storageKey(notebookId: string): string {
  return `${LAST_THREAD_KEY_PREFIX}-${notebookId}`;
}

export function getLastNotebookThread(notebookId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(storageKey(notebookId));
  } catch {
    return null;
  }
}

export function setLastNotebookThread(notebookId: string, threadId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(notebookId), threadId);
  } catch {
    // Ignore storage errors
  }
}

export function clearLastNotebookThread(notebookId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(notebookId));
  } catch {
    // Ignore storage errors
  }
}
