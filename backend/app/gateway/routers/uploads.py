"""Upload router for handling file uploads."""

import logging
import os
import stat

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from deerflow.config.paths import get_paths
from deerflow.notebook import get_notebook_manager
from deerflow.sandbox.sandbox_provider import get_sandbox_provider
from deerflow.uploads.manager import (
    PathTraversalError,
    delete_file_safe,
    enrich_file_listing,
    ensure_uploads_dir,
    list_files_in_dir,
    normalize_filename,
    upload_artifact_url,
    upload_virtual_path,
)
from deerflow.utils.file_conversion import CONVERTIBLE_EXTENSIONS, convert_file_to_markdown

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/threads/{thread_id}/uploads", tags=["uploads"])


class UploadResponse(BaseModel):
    """Response model for file upload."""

    success: bool
    files: list[dict[str, str]]
    message: str


def _make_file_sandbox_writable(file_path: os.PathLike[str] | str) -> None:
    """Ensure uploaded files remain writable when mounted into non-local sandboxes.

    In AIO sandbox mode, the gateway writes the authoritative host-side file
    first, then the sandbox runtime may rewrite the same mounted path. Granting
    world-writable access here prevents permission mismatches between the
    gateway user and the sandbox runtime user.
    """
    file_stat = os.lstat(file_path)
    if stat.S_ISLNK(file_stat.st_mode):
        logger.warning("Skipping sandbox chmod for symlinked upload path: %s", file_path)
        return

    writable_mode = stat.S_IMODE(file_stat.st_mode) | stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH
    chmod_kwargs = {"follow_symlinks": False} if os.chmod in os.supports_follow_symlinks else {}
    os.chmod(file_path, writable_mode, **chmod_kwargs)


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
    files: list[UploadFile] = File(...),
) -> UploadResponse:
    """Upload multiple files to a thread's uploads directory.

    If the thread belongs to a notebook, files are uploaded to the notebook's
    unified uploads directory instead of the thread-specific directory.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    try:
        uploads_dir, sandbox_uploads, notebook_id = _get_upload_dir_for_thread(thread_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    uploaded_files = []

    sandbox_provider = get_sandbox_provider()
    sandbox_id = sandbox_provider.acquire(thread_id)
    sandbox = sandbox_provider.get(sandbox_id)

    for file in files:
        if not file.filename:
            continue

        try:
            safe_filename = normalize_filename(file.filename)
        except ValueError:
            logger.warning(f"Skipping file with unsafe filename: {file.filename!r}")
            continue

        try:
            content = await file.read()
            file_path = uploads_dir / safe_filename
            file_path.write_bytes(content)

            virtual_path = upload_virtual_path(safe_filename)

            if sandbox_id != "local":
                _make_file_sandbox_writable(file_path)
                sandbox.update_file(virtual_path, content)

            file_info = {
                "filename": safe_filename,
                "size": str(len(content)),
                "path": str(file_path),
                "virtual_path": virtual_path,
                "artifact_url": upload_artifact_url(thread_id, safe_filename),
            }

            if notebook_id:
                file_info["notebook_id"] = notebook_id

            logger.info(f"Saved file: {safe_filename} ({len(content)} bytes) to {file_info['path']}")

            file_ext = file_path.suffix.lower()
            if file_ext in CONVERTIBLE_EXTENSIONS:
                md_path = await convert_file_to_markdown(file_path)
                if md_path:
                    md_virtual_path = upload_virtual_path(md_path.name)

                    if sandbox_id != "local":
                        _make_file_sandbox_writable(md_path)
                        sandbox.update_file(md_virtual_path, md_path.read_bytes())

                    file_info["markdown_file"] = md_path.name
                    file_info["markdown_path"] = str(uploads_dir / md_path.name)
                    file_info["markdown_virtual_path"] = md_virtual_path
                    file_info["markdown_artifact_url"] = upload_artifact_url(thread_id, md_path.name)

            uploaded_files.append(file_info)

        except Exception as e:
            logger.error(f"Failed to upload {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}: {str(e)}")

    return UploadResponse(
        success=True,
        files=uploaded_files,
        message=f"Successfully uploaded {len(uploaded_files)} file(s)",
    )


@router.get("/list", response_model=dict)
async def list_uploaded_files(thread_id: str) -> dict:
    """List all files in a thread's uploads directory.

    If the thread belongs to a notebook, lists files from the notebook's
    unified uploads directory.
    """
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
async def delete_uploaded_file(thread_id: str, filename: str) -> dict:
    """Delete a file from a thread's uploads directory.

    If the thread belongs to a notebook, deletes from the notebook's
    unified uploads directory.
    """
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
