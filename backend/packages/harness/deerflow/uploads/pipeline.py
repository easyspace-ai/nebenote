"""Shared upload pipeline (bytes → uploads dir + optional markdown + sandbox sync)."""

from __future__ import annotations

import logging
import os
import stat
from pathlib import Path

from deerflow.sandbox.sandbox_provider import get_sandbox_provider
from deerflow.uploads.manager import normalize_filename, upload_artifact_url, upload_virtual_path
from deerflow.utils.file_conversion import CONVERTIBLE_EXTENSIONS, convert_file_to_markdown

logger = logging.getLogger(__name__)

# Written next to the uploaded file when async markdown conversion fails (notebook uploads).
CONVERSION_ERROR_MARKER = ".conversion-error"


def _make_file_sandbox_writable(file_path: os.PathLike[str] | str) -> None:
    file_stat = os.lstat(file_path)
    if stat.S_ISLNK(file_stat.st_mode):
        logger.warning("Skipping sandbox chmod for symlinked upload path: %s", file_path)
        return
    writable_mode = stat.S_IMODE(file_stat.st_mode) | stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH
    chmod_kwargs = {"follow_symlinks": False} if os.chmod in os.supports_follow_symlinks else {}
    os.chmod(file_path, writable_mode, **chmod_kwargs)


async def process_upload_items(
    uploads_dir: Path,
    thread_id: str,
    items: list[tuple[str, bytes]],
    *,
    notebook_id: str | None = None,
    convert: bool = True,
) -> list[dict[str, str]]:
    """Write files to *uploads_dir* with the same behaviour as the thread uploads API.

    Each item is ``(raw_filename, content)``. Filenames are normalized here.

    When *convert* is False (notebook library fast path), PDF/Office files are written
    and synced to the sandbox but markdown conversion is skipped — call
    :func:`run_upload_markdown_conversion` in a background task for each file.

    Returns the same per-file dict shape as Gateway ``UploadResponse.files``.
    """
    uploads_dir.mkdir(parents=True, exist_ok=True)
    uploads_dir.chmod(0o777)

    sandbox_provider = get_sandbox_provider()
    sandbox_id = sandbox_provider.acquire(thread_id)
    sandbox = sandbox_provider.get(sandbox_id)

    uploaded_files: list[dict[str, str]] = []

    for raw_name, content in items:
        try:
            safe_filename = normalize_filename(raw_name)
        except ValueError:
            logger.warning("Skipping file with unsafe filename: %r", raw_name)
            continue

        file_path = uploads_dir / safe_filename
        file_path.write_bytes(content)

        virtual_path = upload_virtual_path(safe_filename)

        if sandbox_id != "local":
            _make_file_sandbox_writable(file_path)
            sandbox.update_file(virtual_path, content)

        file_info: dict[str, str] = {
            "filename": safe_filename,
            "size": str(len(content)),
            "path": str(file_path),
            "virtual_path": virtual_path,
            "artifact_url": upload_artifact_url(thread_id, safe_filename),
        }
        if notebook_id:
            file_info["notebook_id"] = notebook_id

        file_ext = file_path.suffix.lower()
        if convert and file_ext in CONVERTIBLE_EXTENSIONS:
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

    return uploaded_files


async def run_upload_markdown_conversion(file_path: Path, thread_id: str) -> None:
    """Run markdown conversion for one uploaded file (notebook async path).

    On success, writes ``mnd_<stem>.md`` and syncs to sandbox. On failure, writes
    ``<stem>.conversion-error`` with the error text so :func:`list_documents` can
    surface ``DocumentStatus.FAILED``.
    """
    uploads_dir = file_path.parent
    stem = file_path.stem
    error_path = uploads_dir / f"{stem}{CONVERSION_ERROR_MARKER}"
    error_path.unlink(missing_ok=True)
    if file_path.suffix.lower() not in CONVERTIBLE_EXTENSIONS:
        return
    try:
        sandbox_provider = get_sandbox_provider()
        sandbox_id = sandbox_provider.acquire(thread_id)
        sandbox = sandbox_provider.get(sandbox_id)
        md_path = await convert_file_to_markdown(file_path)
        if md_path:
            md_virtual_path = upload_virtual_path(md_path.name)
            if sandbox_id != "local":
                _make_file_sandbox_writable(md_path)
                sandbox.update_file(md_virtual_path, md_path.read_bytes())
    except Exception as e:
        logger.exception("Upload markdown conversion failed for %s", file_path)
        try:
            error_path.write_text(str(e), encoding="utf-8")
        except OSError:
            logger.warning("Could not write conversion error marker %s", error_path)
