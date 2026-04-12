"use client";

import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import {
  FileText,
  UploadIcon,
  TrashIcon,
  ArrowLeftIcon,
  MessageSquareIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/core/i18n/hooks";
import {
  useNotebook,
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDocumentProcessingStatus,
  useUpdateNotebook,
  useCreateThread,
} from "@/core/notebook/hooks";
import type { Document } from "@/core/notebook/types";

// File type to icon mapping
const getFileIcon = (_fileType: string) => {
  return FileText;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "ready":
      return "bg-green-500";
    case "processing":
      return "bg-blue-500";
    case "failed":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export default function NotebookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { locale } = useI18n();
  const notebookId = params.notebookId as string;

  const { data: notebook, isLoading: isLoadingNotebook } = useNotebook(notebookId);
  const { data: documents, isLoading: isLoadingDocuments } = useDocuments(notebookId);
  const uploadDocument = useUploadDocument(notebookId);
  const deleteDocument = useDeleteDocument(notebookId);
  const updateNotebook = useUpdateNotebook(notebookId);
  const createThread = useCreateThread(notebookId);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const dateLocale = locale === "zh-CN" ? zhCN : enUS;

  // Initialize edit form when notebook loads
  if (notebook && !editTitle) {
    setEditTitle(notebook.title);
    setEditDescription(notebook.description ?? "");
  }

  const handleEditNotebook = async () => {
    if (!editTitle.trim()) return;

    try {
      await updateNotebook.mutateAsync({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update notebook:", error);
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    setUploadFiles(Array.from(files));
  }, []);

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    try {
      for (const file of uploadFiles) {
        await uploadDocument.mutateAsync({ file, title: file.name });
      }
      setIsUploadDialogOpen(false);
      setUploadFiles([]);
    } catch (error) {
      console.error("Failed to upload documents:", error);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await deleteDocument.mutateAsync(docId);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleCreateThread = async () => {
    try {
      const result = await createThread.mutateAsync("New Conversation");
      // Navigate to the new thread with notebookId in URL
      router.push(`/workspace/notebooks/${notebookId}/chats/${result.thread_id}`);
    } catch (error) {
      console.error("Failed to create thread:", error);
    }
  };

  if (isLoadingNotebook) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="secondary" className="mb-6" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-8" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="container mx-auto py-8">
        <Empty>
          <EmptyTitle>Notebook not found</EmptyTitle>
          <EmptyDescription>The notebook you are looking for does not exist</EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Button
            variant="secondary"
            className="mb-4"
            onClick={() => router.push("/workspace/notebooks")}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Notebooks
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">{notebook.title}</h1>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Notebook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="edit-title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="edit-description" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="edit-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleEditNotebook}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {notebook.description && (
            <p className="text-muted-foreground mt-2">{notebook.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>{notebook.documents.length} documents</span>
            <span>{notebook.thread_ids.length} threads</span>
            <span>
              Updated{" "}
              {formatDistanceToNow(new Date(notebook.updated_at * 1000), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleCreateThread}>
            <MessageSquareIcon className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload PDF, Word, PowerPoint, or Excel files to your notebook.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <UploadIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">Click to select files</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or drag and drop here
                  </p>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected files:</p>
                    {uploadFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsUploadDialogOpen(false);
                    setUploadFiles([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploadFiles.length === 0 || uploadDocument.isPending}
                >
                  {uploadDocument.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">
            Documents ({documents?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="threads">
            Threads ({notebook.thread_ids.length})
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          {isLoadingDocuments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.doc_id}
                  document={doc}
                  notebookId={notebookId}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyTitle>No documents yet</EmptyTitle>
              <EmptyDescription>Upload your first document to get started</EmptyDescription>
            </Empty>
          )}
        </TabsContent>

        {/* Threads Tab */}
        <TabsContent value="threads" className="mt-6">
          <div className="space-y-4">
            {notebook.thread_ids.length > 0 ? (
              notebook.thread_ids.map((threadId) => (
                <Card
                  key={threadId}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/workspace/notebooks/${notebookId}/chats/${threadId}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Conversation {threadId.substring(0, 8)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Click to open this conversation
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Empty>
                <EmptyTitle>No threads yet</EmptyTitle>
                <EmptyDescription>Start your first conversation in this notebook</EmptyDescription>
              </Empty>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Document Card Component
function DocumentCard({
  document,
  notebookId,
  onDelete,
}: {
  document: Document;
  notebookId: string;
  onDelete: (docId: string) => void;
}) {
  const { data: status } = useDocumentProcessingStatus(
    notebookId,
    document.doc_id,
    { enabled: document.status === "pending" || document.status === "processing" }
  );

  const displayStatus = status?.status ?? document.status;
  const Icon = getFileIcon(document.file_type);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-2">{document.title}</CardTitle>
              <CardDescription className="text-xs mt-1 truncate">
                {document.original_filename}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-xs"
            >
              <span
                className={`h-2 w-2 rounded-full ${getStatusColor(displayStatus)}`}
              />
              {displayStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{(document.file_size / 1024).toFixed(1)} KB</span>
          {document.outline && document.outline.length > 0 && (
            <span>{document.outline.length} sections</span>
          )}
        </div>
        {displayStatus === "processing" && (
          <div className="mt-3">
            <Progress value={50} className="h-1" />
          </div>
        )}
      </CardContent>
      <div className="px-6 pb-4 flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDelete(document.doc_id)}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
