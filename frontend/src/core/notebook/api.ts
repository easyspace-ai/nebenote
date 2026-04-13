// API client for Notebook operations

import { getAPIClient } from '@/core/api';
import { bearerAuthHeaders } from '@/core/auth/bearer-headers';

import type {
  Notebook,
  Document,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  ProcessingStatusResponse,
} from './types';

const API_BASE = '/api/notebooks';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
      ...bearerAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// === Notebook API ===

export async function createNotebook(
  data: CreateNotebookRequest
): Promise<{ notebook: Notebook }> {
  return fetchJson(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listNotebooks(): Promise<{ notebooks: Notebook[] }> {
  return fetchJson(API_BASE);
}

export async function getNotebook(notebookId: string): Promise<{ notebook: Notebook }> {
  return fetchJson(`${API_BASE}/${notebookId}`);
}

export async function updateNotebook(
  notebookId: string,
  data: UpdateNotebookRequest
): Promise<{ notebook: Notebook }> {
  return fetchJson(`${API_BASE}/${notebookId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteNotebook(notebookId: string): Promise<{ success: boolean; message: string }> {
  return fetchJson(`${API_BASE}/${notebookId}`, {
    method: 'DELETE',
  });
}

// === Document API ===

export async function uploadDocument(
  notebookId: string,
  file: File,
  title?: string
): Promise<{ document: Document }> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) {
    formData.append('title', title);
  }

  const response = await fetch(`${API_BASE}/${notebookId}/documents`, {
    method: 'POST',
    body: formData,
    headers: {
      ...bearerAuthHeaders(),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listDocuments(
  notebookId: string
): Promise<{ documents: Document[] }> {
  return fetchJson(`${API_BASE}/${notebookId}/documents`);
}

export async function getDocument(
  notebookId: string,
  docId: string
): Promise<{ document: Document }> {
  return fetchJson(`${API_BASE}/${notebookId}/documents/${encodeURIComponent(docId)}`);
}

export async function deleteDocument(
  notebookId: string,
  docId: string
): Promise<{ success: boolean; message: string }> {
  return fetchJson(`${API_BASE}/${notebookId}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
}

export async function renameDocument(
  notebookId: string,
  docId: string,
  title: string
): Promise<{ document: Document }> {
  return fetchJson(`${API_BASE}/${notebookId}/documents/${encodeURIComponent(docId)}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

export async function getDocumentProcessingStatus(
  notebookId: string,
  docId: string
): Promise<ProcessingStatusResponse> {
  return fetchJson(`${API_BASE}/${notebookId}/documents/${encodeURIComponent(docId)}/status`);
}

export async function getDocumentContent(
  notebookId: string,
  docId: string
): Promise<{ content: string }> {
  return fetchJson(`${API_BASE}/${notebookId}/documents/${encodeURIComponent(docId)}/content`);
}

// === Thread API ===

export async function createThread(
  notebookId: string,
  title?: string
): Promise<{ thread_id: string }> {
  const params = title ? `?title=${encodeURIComponent(title)}` : '';

  const thread = await getAPIClient().threads.create();

  try {
    await getAPIClient().threads.update(thread.thread_id, {
      metadata: { notebook_id: notebookId },
    });
  } catch (error) {
    throw new Error(
      `Failed to attach notebook context to thread ${thread.thread_id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return fetchJson(
    `${API_BASE}/${notebookId}/threads${params}${params ? '&' : '?'}thread_id=${encodeURIComponent(thread.thread_id)}`,
    {
      method: 'POST',
    }
  );
}

export async function listThreads(
  notebookId: string
): Promise<{ thread_ids: string[] }> {
  return fetchJson(`${API_BASE}/${notebookId}/threads`);
}
