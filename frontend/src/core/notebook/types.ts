// TypeScript types for the Notebook system

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface OutlineItem {
  title: string;
  line: number;
  level: number;
}

export interface DocumentStats {
  page_count?: number;
  word_count?: number;
  chunk_count?: number;
}

export interface Document {
  doc_id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  title: string;
  author?: string;
  status: DocumentStatus;
  created_at: number;
  error_message?: string;
  outline: OutlineItem[];
  stats: DocumentStats;
}

export interface NotebookSettings {
  default_model?: string;
  chunking_strategy: 'section' | 'semantic' | 'paragraph';
  auto_summarize: boolean;
  max_chunk_size: number;
  chunk_overlap: number;
}

export interface Notebook {
  notebook_id: string;
  title: string;
  description?: string;
  tags: string[];
  documents: Document[];
  thread_ids: string[];
  created_at: number;
  updated_at: number;
  settings: NotebookSettings;
}

export interface CreateNotebookRequest {
  title: string;
  description?: string;
  tags?: string[];
}

export interface UpdateNotebookRequest {
  title?: string;
  description?: string;
  tags?: string[];
  settings?: NotebookSettings;
}

export interface ProcessingStatusResponse {
  status: string;
  error?: string;
  outline_count?: number;
}

// === Frontend-specific types ===

export interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  doc_id?: string;
}

export interface DocumentMention {
  id: string;
  title: string;
  display: string; // e.g., "@[Document Title](doc_abc123)"
}

export interface UploadState {
  files: UploadingFile[];
  addFile: (file: File) => void;
  removeFile: (index: number) => void;
  updateProgress: (index: number, progress: number) => void;
  setStatus: (index: number, status: UploadingFile['status'], error?: string) => void;
  clear: () => void;
}
