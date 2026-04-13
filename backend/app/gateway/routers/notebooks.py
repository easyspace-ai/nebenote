"""Notebook API endpoints."""

import logging
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.gateway.deps import get_checkpointer, get_store
from app.gateway.routers.auth import User, get_current_user
from app.gateway.routers.threads import THREADS_NS, create_thread_record
from deerflow.notebook import (
    Document,
    DocumentStatus,
    Notebook,
    NotebookManager,
    NotebookSettings,
    get_notebook_manager,
)
from deerflow.uploads.pipeline import process_upload_items

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


class UpdateDocumentRequest(BaseModel):
    title: str


class ThreadCreateResponse(BaseModel):
    thread_id: str


class ProcessingStatusResponse(BaseModel):
    status: str
    error: str | None = None
    outline_count: int | None = None


# == Helper Functions ==

def _manager() -> NotebookManager:
    return get_notebook_manager()


async def _thread_exists(request: Request, thread_id: str) -> bool:
    """Check whether a thread exists in runtime storage/checkpoints."""
    checkpointer = get_checkpointer(request)
    config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
    try:
        checkpoint_tuple = await checkpointer.aget_tuple(config)
        if checkpoint_tuple is not None:
            return True
    except Exception:
        logger.debug("Failed to resolve checkpoint for thread %s", thread_id, exc_info=True)

    store = get_store(request)
    if store is None:
        return False

    try:
        return await store.aget(THREADS_NS, thread_id) is not None
    except Exception:
        logger.debug("Failed to resolve store record for thread %s", thread_id, exc_info=True)
        return False


async def _filter_existing_thread_ids(request: Request, thread_ids: list[str]) -> list[str]:
    """Keep only thread IDs that still exist in runtime metadata/checkpoints."""
    existing: list[str] = []
    for thread_id in thread_ids:
        if await _thread_exists(request, thread_id):
            existing.append(thread_id)
    return existing


async def _get_or_create_upload_thread(notebook_id: str, request: Request) -> str:
    """Thread used for notebook uploads (same sandbox + conversion pipeline as chat uploads)."""
    nb = _manager().get_notebook(notebook_id)
    tid = nb.settings.upload_thread_id
    if tid and tid in nb.thread_ids:
        return tid
    created = await create_thread_record(request, metadata={"notebook_id": notebook_id})
    _manager().set_upload_thread_id(notebook_id, created.thread_id)
    return created.thread_id


def _notebook_owned_or_404(notebook_id: str, user_id: str) -> Notebook:
    """Return notebook if owned by user, else 404 (no existence leak)."""
    try:
        nb = _manager().get_notebook(notebook_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if nb.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return nb


# == Notebook Endpoints ==

@router.post("", response_model=NotebookResponse)
async def create_notebook(request: CreateNotebookRequest, user: User = Depends(get_current_user)):
    """Create a new notebook."""
    notebook = _manager().create_notebook(
        title=request.title,
        description=request.description,
        tags=request.tags,
        owner_id=user.id,
    )
    return {"notebook": notebook}


@router.get("", response_model=NotebookListResponse)
async def list_notebooks(request: Request, user: User = Depends(get_current_user)):
    """List notebooks owned by the current user."""
    notebooks = _manager().list_notebooks(owner_id=user.id)
    filtered: list[Notebook] = []
    for notebook in notebooks:
        filtered_thread_ids = await _filter_existing_thread_ids(request, notebook.thread_ids)
        filtered.append(notebook.model_copy(update={"thread_ids": filtered_thread_ids}))
    notebooks = filtered
    return {"notebooks": notebooks}


@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str, request: Request, user: User = Depends(get_current_user)):
    """Get a notebook by ID."""
    notebook = _notebook_owned_or_404(notebook_id, user.id)
    filtered_thread_ids = await _filter_existing_thread_ids(request, notebook.thread_ids)
    notebook = notebook.model_copy(update={"thread_ids": filtered_thread_ids})
    return {"notebook": notebook}


@router.put("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
    notebook_id: str,
    request: UpdateNotebookRequest,
    user: User = Depends(get_current_user),
):
    """Update a notebook's metadata."""
    _notebook_owned_or_404(notebook_id, user.id)
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
async def delete_notebook(notebook_id: str, user: User = Depends(get_current_user)):
    """Delete a notebook and all its data."""
    _notebook_owned_or_404(notebook_id, user.id)
    _manager().delete_notebook(notebook_id)
    return {"success": True, "message": f"Deleted notebook {notebook_id}"}


# == Document Endpoints ==

@router.post("/{notebook_id}/documents", response_model=DocumentResponse)
async def upload_document(
    notebook_id: str,
    request: Request,
    file: UploadFile = File(...),
    title: str | None = None,
    user: User = Depends(get_current_user),
):
    """Upload a file into the notebook shared user-data/uploads (same pipeline as thread uploads)."""
    logger.info(
        "[Notebook Upload] notebook=%s file=%r",
        notebook_id,
        file.filename,
    )

    _notebook_owned_or_404(notebook_id, user.id)

    thread_id = await _get_or_create_upload_thread(notebook_id, request)
    content = await file.read()
    raw_name = file.filename or "unknown"
    uploads_dir = _manager().paths.uploads_dir(notebook_id)

    try:
        uploaded = await process_upload_items(
            Path(uploads_dir),
            thread_id,
            [(raw_name, content)],
            notebook_id=notebook_id,
        )
    except Exception as e:
        logger.exception("[Notebook Upload] Failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to upload: {e!s}") from e

    if not uploaded:
        raise HTTPException(status_code=400, detail="No valid file uploaded")

    info = uploaded[0]
    fn = info["filename"]
    p = Path(fn)
    doc = Document(
        doc_id=fn,
        original_filename=fn,
        file_type=p.suffix[1:].lower() if p.suffix else "unknown",
        file_size=int(info["size"]),
        title=title or fn,
        status=DocumentStatus.READY,
        created_at=time.time(),
        updated_at=time.time(),
    )
    logger.info("[Notebook Upload] done doc_id=%s thread_id=%s", doc.doc_id, thread_id)
    return {"document": doc}


@router.get("/{notebook_id}/documents", response_model=DocumentListResponse)
async def list_documents(notebook_id: str, user: User = Depends(get_current_user)):
    """List all documents in a notebook."""
    _notebook_owned_or_404(notebook_id, user.id)
    try:
        documents = _manager().list_documents(notebook_id)
        return {"documents": documents}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.get("/{notebook_id}/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(notebook_id: str, doc_id: str, user: User = Depends(get_current_user)):
    """Get a document's metadata."""
    _notebook_owned_or_404(notebook_id, user.id)
    try:
        doc = _manager().get_document(notebook_id, doc_id)
        return {"document": doc}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.delete("/{notebook_id}/documents/{doc_id}")
async def delete_document(notebook_id: str, doc_id: str, user: User = Depends(get_current_user)):
    """Delete a document from a notebook."""
    _notebook_owned_or_404(notebook_id, user.id)
    try:
        _manager().delete_document(notebook_id, doc_id)
        return {"success": True, "message": f"Deleted document {doc_id}"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


@router.put("/{notebook_id}/documents/{doc_id}", response_model=DocumentResponse)
async def rename_document(
    notebook_id: str,
    doc_id: str,
    request: UpdateDocumentRequest,
    user: User = Depends(get_current_user),
):
    """Rename a document in a notebook."""
    _notebook_owned_or_404(notebook_id, user.id)
    try:
        doc = _manager().rename_document(notebook_id, doc_id, request.title)
        return {"document": doc}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{notebook_id}/documents/{doc_id}/status", response_model=ProcessingStatusResponse)
async def get_document_processing_status(
    notebook_id: str, doc_id: str, user: User = Depends(get_current_user)
):
    """Get the processing status of a document."""
    _notebook_owned_or_404(notebook_id, user.id)
    status = _manager().get_document_processing_status(notebook_id, doc_id)
    return ProcessingStatusResponse(**status)


@router.get("/{notebook_id}/documents/{doc_id}/content")
async def get_document_content(notebook_id: str, doc_id: str, user: User = Depends(get_current_user)):
    """Get the converted Markdown content of a document."""
    _notebook_owned_or_404(notebook_id, user.id)
    try:
        content = _manager().read_document_content(notebook_id, doc_id)
        if content is None:
            raise HTTPException(status_code=404, detail="Document content not available")
        return {"content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Document not found")


# == Thread Endpoints ==

@router.post("/{notebook_id}/threads", response_model=ThreadCreateResponse)
async def create_thread(
    notebook_id: str,
    request: Request,
    title: str | None = None,
    thread_id: str | None = None,
    user: User = Depends(get_current_user),
):
    """Create a new chat thread in a notebook."""
    try:
        _notebook_owned_or_404(notebook_id, user.id)
        created_thread = await create_thread_record(
            request,
            thread_id=thread_id,
            metadata={"notebook_id": notebook_id, "user_id": user.id},
        )
        tracked_thread_id = _manager().create_thread(
            notebook_id,
            title=title,
            thread_id_override=created_thread.thread_id,
        )
        return {"thread_id": tracked_thread_id}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")


@router.get("/{notebook_id}/threads")
async def list_threads(notebook_id: str, request: Request, user: User = Depends(get_current_user)):
    """List all threads in a notebook."""
    _notebook_owned_or_404(notebook_id, user.id)
    try:
        thread_ids = _manager().list_threads(notebook_id)
        thread_ids = await _filter_existing_thread_ids(request, thread_ids)
        return {"thread_ids": thread_ids}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
