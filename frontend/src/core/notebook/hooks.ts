// React Query hooks for Notebook system

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import * as notebookApi from './api';
import type {
  Notebook,
  Document,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  ProcessingStatusResponse,
} from './types';

// === Query Keys ===

export const queryKeys = {
  all: ['notebooks'] as const,
  list: () => [...queryKeys.all, 'list'] as const,
  detail: (notebookId: string) => [...queryKeys.all, 'detail', notebookId] as const,
  documents: (notebookId: string) => [...queryKeys.all, notebookId, 'documents'] as const,
  document: (notebookId: string, docId: string) => [...queryKeys.all, notebookId, 'document', docId] as const,
  documentStatus: (notebookId: string, docId: string) => [...queryKeys.all, notebookId, 'docStatus', docId] as const,
  threads: (notebookId: string) => [...queryKeys.all, notebookId, 'threads'] as const,
};

// === Notebook Hooks ===

export function useNotebooks(): UseQueryResult<Notebook[], Error> {
  return useQuery({
    queryKey: queryKeys.list(),
    queryFn: async () => {
      const result = await notebookApi.listNotebooks();
      return result.notebooks;
    },
  });
}

export function useNotebook(notebookId: string | undefined): UseQueryResult<Notebook, Error> {
  return useQuery({
    queryKey: queryKeys.detail(notebookId!),
    queryFn: async () => {
      const result = await notebookApi.getNotebook(notebookId!);
      return result.notebook;
    },
    enabled: !!notebookId,
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotebookRequest) => notebookApi.createNotebook(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    },
  });
}

export function useUpdateNotebook(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateNotebookRequest) => notebookApi.updateNotebook(notebookId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.detail(notebookId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: string) => notebookApi.deleteNotebook(notebookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.list() });
    },
  });
}

// === Document Hooks ===

export function useDocuments(notebookId: string | undefined): UseQueryResult<Document[], Error> {
  return useQuery({
    queryKey: queryKeys.documents(notebookId!),
    queryFn: async () => {
      const result = await notebookApi.listDocuments(notebookId!);
      // Filter out transcribed markdown files (those starting with "mnd_")
      const filteredDocs = result.documents.filter(
        (doc) => !doc.original_filename?.startsWith("mnd_")
      );
      return filteredDocs;
    },
    enabled: !!notebookId,
  });
}

export function useDocument(notebookId: string, docId: string): UseQueryResult<Document, Error> {
  return useQuery({
    queryKey: queryKeys.document(notebookId, docId),
    queryFn: async () => {
      const result = await notebookApi.getDocument(notebookId, docId);
      return result.document;
    },
  });
}

export function useUploadDocument(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      notebookApi.uploadDocument(notebookId, file, title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents(notebookId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.detail(notebookId) });
    },
  });
}

export function useDeleteDocument(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => notebookApi.deleteDocument(notebookId, docId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents(notebookId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.detail(notebookId) });
    },
  });
}

export function useDocumentProcessingStatus(
  notebookId: string,
  docId: string,
  options?: { enabled?: boolean }
): UseQueryResult<ProcessingStatusResponse, Error> {
  return useQuery({
    queryKey: queryKeys.documentStatus(notebookId, docId),
    queryFn: async () => notebookApi.getDocumentProcessingStatus(notebookId, docId),
    refetchInterval: 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useDocumentContent(notebookId: string, docId: string) {
  return useQuery({
    queryKey: ['notebook', notebookId, 'docContent', docId],
    queryFn: async () => notebookApi.getDocumentContent(notebookId, docId),
  });
}

// === Thread Hooks ===

export function useThreads(notebookId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.threads(notebookId!),
    queryFn: async () => {
      const result = await notebookApi.listThreads(notebookId!);
      return result.thread_ids;
    },
    enabled: !!notebookId,
  });
}

export function useCreateThread(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => notebookApi.createThread(notebookId, title),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.threads(notebookId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.detail(notebookId) });
    },
  });
}
