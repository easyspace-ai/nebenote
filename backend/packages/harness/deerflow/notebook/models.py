"""Data models for the Notebook system."""

from enum import Enum

from pydantic import BaseModel, Field


class DocumentStatus(str, Enum):
    """Document processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class OutlineItem(BaseModel):
    """An item in the document outline."""
    title: str
    line: int
    level: int = 1


class DocumentStats(BaseModel):
    """Statistics about a document."""
    page_count: int | None = None
    word_count: int | None = None
    chunk_count: int | None = None


class Document(BaseModel):
    """A document in a notebook."""
    doc_id: str
    original_filename: str
    file_type: str
    file_size: int
    title: str
    author: str | None = None
    status: DocumentStatus
    created_at: float
    updated_at: float | None = None
    error_message: str | None = None
    outline: list[OutlineItem] = Field(default_factory=list)
    stats: DocumentStats = Field(default_factory=DocumentStats)
    # Symlink names under user-data/uploads/ → documents/... (Skills use /mnt/user-data/uploads/)
    uploads_mirror_original: str | None = None
    uploads_mirror_markdown: str | None = None

    @property
    def is_ready(self) -> bool:
        return self.status == DocumentStatus.READY


class ThreadInfo(BaseModel):
    """Information about a chat thread in a notebook."""
    thread_id: str
    title: str
    created_at: float
    updated_at: float
    message_count: int = 0


class NotebookSettings(BaseModel):
    """Settings for a notebook."""
    default_model: str | None = None
    chunking_strategy: str = "section"  # section, semantic, paragraph
    auto_summarize: bool = True
    max_chunk_size: int = 1000
    chunk_overlap: int = 200
    archived: bool = False
    # Thread used for notebook library uploads (same pipeline as POST /api/threads/{id}/uploads).
    upload_thread_id: str | None = None


class Notebook(BaseModel):
    """A notebook containing multiple documents and chat threads."""
    notebook_id: str
    owner_id: str | None = None
    title: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    documents: list[Document] = Field(default_factory=list)
    thread_ids: list[str] = Field(default_factory=list)
    created_at: float
    updated_at: float
    settings: NotebookSettings = Field(default_factory=NotebookSettings)

    @property
    def ready_documents(self) -> list[Document]:
        return [d for d in self.documents if d.is_ready]

    def get_document(self, doc_id: str) -> Document | None:
        for doc in self.documents:
            if doc.doc_id == doc_id:
                return doc
        return None
