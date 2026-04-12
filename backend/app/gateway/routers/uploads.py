"""Upload router for handling file uploads."""

import logging
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.gateway.routers.auth import User, get_current_user
from app.gateway.thread_access import require_thread_access
from deerflow.config.paths import get_paths
from deerflow.notebook import get_notebook_manager
from deerflow.uploads.manager import (
    PathTraversalError,
    delete_file_safe,
    enrich_file_listing,
    ensure_uploads_dir,
    list_files_in_dir,
    normalize_filename,
)
from deerflow.uploads.pipeline import process_upload_items
from deerflow.utils.file_conversion import CONVERTIBLE_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/threads/{thread_id}/uploads", tags=["uploads"])


class UploadResponse(BaseModel):
    """Response model for file upload."""

    success: bool
    files: list[dict[str, str]]
    message: str


def _get_upload_dir_for_thread(thread_id: str) -> tuple[os.PathLike, os.PathLike, str | None]:
    """Get the appropriate upload directory for a thread.

    Returns:
        (uploads_dir, sandbox_uploads_dir, notebook_id)
        - If thread belongs to a notebook: notebook's uploads dir
        - Otherwise: thread's uploads dir
    """
    paths = get_paths()

    # Check if thread belongs to a notebook
    nb_manager = get_notebook_manager()
    notebook = nb_manager.get_notebook_for_thread(thread_id)

    if notebook:
        # Use notebook's unified uploads directory
        nb_paths = nb_manager.paths
        uploads_dir = nb_paths.uploads_dir(notebook.notebook_id)
        uploads_dir.mkdir(parents=True, exist_ok=True)
        uploads_dir.chmod(0o777)
        # Sandbox virtual path still uses /mnt/user-data/uploads/
        # but we'll adjust the mapping in sandbox tools
        sandbox_uploads = paths.sandbox_uploads_dir(thread_id)
        return uploads_dir, sandbox_uploads, notebook.notebook_id

    # Regular thread uploads
    uploads_dir = ensure_uploads_dir(thread_id)
    sandbox_uploads = paths.sandbox_uploads_dir(thread_id)
    return uploads_dir, sandbox_uploads, None


@router.post("", response_model=UploadResponse)
async def upload_files(
    thread_id: str,
    request: Request,
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
) -> UploadResponse:
    """Upload multiple files to a thread's uploads directory.

    If the thread belongs to a notebook, files are uploaded to the notebook's
    unified uploads directory instead of the thread-specific directory.
    """
    await require_thread_access(request, thread_id, user)
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        uploads_dir, sandbox_uploads, notebook_id = _get_upload_dir_for_thread(thread_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    uploaded_files = []

    items: list[tuple[str, bytes]] = []
    for file in files:
        if not file.filename:
            continue
        try:
            normalize_filename(file.filename)
        except ValueError:
            logger.warning(f"Skipping file with unsafe filename: {file.filename!r}")
            continue
        content = await file.read()
        items.append((file.filename, content))

    if not items:
        raise HTTPException(status_code=400, detail="No valid files provided")

    try:
        uploaded_files = await process_upload_items(
            Path(uploads_dir),
            thread_id,
            items,
            notebook_id=notebook_id,
        )
    except Exception as e:
        logger.error(f"Failed to upload files: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload files: {str(e)}")

    return UploadResponse(
        success=True,
        files=uploaded_files,
        message=f"Successfully uploaded {len(uploaded_files)} file(s)",
    )


@router.get("/list", response_model=dict)
async def list_uploaded_files(
    thread_id: str,
    request: Request,
    user: User = Depends(get_current_user),
) -> dict:
    """List all files in a thread's uploads directory.

    If the thread belongs to a notebook, lists files from the notebook's
    unified uploads directory.
    """
    await require_thread_access(request, thread_id, user)
    uploads_dir, sandbox_uploads, notebook_id = _get_upload_dir_for_thread(thread_id)

    result = list_files_in_dir(uploads_dir)
    enrich_file_listing(result, thread_id)

    # Gateway additionally includes the sandbox-relative path.
    for f in result["files"]:
        f["path"] = str(uploads_dir / f["filename"])
        if notebook_id:
            f["notebook_id"] = notebook_id

    return result


@router.delete("/{filename}")
async def delete_uploaded_file(
    thread_id: str,
    filename: str,
    request: Request,
    user: User = Depends(get_current_user),
) -> dict:
    """Delete a file from a thread's uploads directory.

    If the thread belongs to a notebook, deletes from the notebook's
    unified uploads directory.
    """
    await require_thread_access(request, thread_id, user)
    uploads_dir, _, notebook_id = _get_upload_dir_for_thread(thread_id)

    try:
        result = delete_file_safe(uploads_dir, filename, convertible_extensions=CONVERTIBLE_EXTENSIONS)
        if notebook_id:
            result["notebook_id"] = notebook_id
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")
    except PathTraversalError:
        raise HTTPException(status_code=400, detail="Invalid path")
    except Exception as e:
        logger.error(f"Failed to delete {filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete {filename}: {str(e)}")
