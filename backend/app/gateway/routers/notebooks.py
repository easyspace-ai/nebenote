"""Notebook API endpoints."""

import logging
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from deerflow.notebook import (
    Document,
    Notebook,
    NotebookManager,
    NotebookSettings,
    get_notebook_manager,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


# == Request/Response Models ==

class CreateNotebookRequest(BaseModel):
    title: str
    description: str | None = None
    tags: list[str] | None = None


class UpdateNotebookRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    tags: list[str] | None = None
    settings: NotebookSettings | None = None


class NotebookListResponse(BaseModel):
    notebooks: list[Notebook]


class NotebookResponse(BaseModel):
    notebook: Notebook


class DocumentListResponse(BaseModel):
    documents: list[Document]


class DocumentResponse(BaseModel):
    document: Document


class ThreadCreateResponse(BaseModel):
    thread_id: str


class ProcessingStatusResponse(BaseModel):
    status: str
    error: str | None = None
    outline_count: int | None = None


# == Helper Functions ==

def _manager() -> NotebookManager:
    return get_notebook_manager()


# == Notebook Endpoints ==

@router.post("", response_model=NotebookResponse)
async def create_notebook(request: CreateNotebookRequest):
    """Create a new notebook."""
    notebook = _manager().create_notebook(
        title=request.title,
        description=request.description,
        tags=request.tags,
    )
    return {"notebook": notebook}


@router.get("", response_model=NotebookListResponse)
async def list_notebooks():
    """List all notebooks."""
    notebooks = _manager().list_notebooks()
    return {"notebooks": notebooks}


@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str):
    """Get a notebook by ID."""
    try:
        notebook = _manager().get_notebook(notebook_id)
        return {"notebook": notebook}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.put("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(notebook_id: str, request: UpdateNotebookRequest):
    """Update a notebook's metadata."""
    try:
        notebook = _manager().update_notebook(
            notebook_id,
            title=request.title,
            description=request.description,
            tags=request.tags,
            settings=request.settings,
        )
        return {"notebook": notebook}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.delete("/{notebook_id}")
async def delete_notebook(notebook_id: str):
    """Delete a notebook and all its data."""
    _manager().delete_notebook(notebook_id)
    return {"success": True, "message": f"Deleted notebook {notebook_id}"}


# == Document Endpoints ==

@router.post("/{notebook_id}/documents", response_model=DocumentResponse)
async def upload_document(
    notebook_id: str,
    file: UploadFile = File(...),
    title: str | None = None,
):
    """Upload a document to a notebook."""
    logger.info(f"[Notebook Upload] Starting upload for notebook {notebook_id}: {file.filename} (size: {file.size} bytes)")

    try:
        # Verify notebook exists
        _manager().get_notebook(notebook_id)
        logger.debug(f"[Notebook Upload] Verified notebook exists: {notebook_id}")
    except FileNotFoundError:
        logger.error(f"[Notebook Upload] Notebook not found: {notebook_id}")
        raise HTTPException(status_code=404, detail="Notebook not found")

    # Save uploaded file to temp
    suffix = Path(file.filename).suffix if file.filename else ".bin"
    logger.debug(f"[Notebook Upload] Using temporary file suffix: {suffix}")

    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)
        logger.info(f"[Notebook Upload] Saved temporary file: {tmp_path} ({len(content)} bytes)")

    try:
        logger.info("[Notebook Upload] Adding document to notebook manager...")
        doc = _manager().add_document(
            notebook_id,
            tmp_path,
            original_filename=file.filename or "unknown",
            title=title,
        )
        logger.info(f"[Notebook Upload] Document created successfully: doc_id={doc.doc_id}, status={doc.status}")
        return {"document": doc}
    except Exception as e:
        logger.exception(f"[Notebook Upload] Failed to process document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
    finally:
        tmp_path.unlink(missing_ok=True)
        logger.debug(f"[Notebook Upload] Cleaned up temporary file: {tmp_path}")


@router.get("/{notebook_id}/documents", response_model=DocumentListResponse)
async def list_documents(notebook_id: str):
    """List all documents in a notebook."""
    try:
        documents = _manager().list_documents(notebook_id)
        return {"documents": documents}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.get("/{notebook_id}/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(notebook_id: str, doc_id: str):
    """Get a document's metadata."""
    try:
        doc = _manager().get_document(notebook_id, doc_id)
        return {"document": doc}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.delete("/{notebook_id}/documents/{doc_id}")
async def delete_document(notebook_id: str, doc_id: str):
    """Delete a document from a notebook."""
    try:
        _manager().delete_document(notebook_id, doc_id)
        return {"success": True, "message": f"Deleted document {doc_id}"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{notebook_id}/documents/{doc_id}/status", response_model=ProcessingStatusResponse)
async def get_document_processing_status(notebook_id: str, doc_id: str):
    """Get the processing status of a document."""
    status = _manager().get_document_processing_status(notebook_id, doc_id)
    return ProcessingStatusResponse(**status)


@router.get("/{notebook_id}/documents/{doc_id}/content")
async def get_document_content(notebook_id: str, doc_id: str):
    """Get the converted Markdown content of a document."""
    try:
        content = _manager().read_document_content(notebook_id, doc_id)
        if content is None:
            raise HTTPException(status_code=404, detail="Document content not available")
        return {"content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


# == Thread Endpoints ==

@router.post("/{notebook_id}/threads", response_model=ThreadCreateResponse)
async def create_thread(notebook_id: str, title: str | None = None, thread_id: str | None = None):
    """Create a new chat thread in a notebook."""
    try:
        thread_id = _manager().create_thread(notebook_id, title=title, thread_id_override=thread_id)
        return {"thread_id": thread_id}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.get("/{notebook_id}/threads")
async def list_threads(notebook_id: str):
    """List all threads in a notebook."""
    try:
        thread_ids = _manager().list_threads(notebook_id)
        return {"thread_ids": thread_ids}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
