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
) -> list[dict[str, str]]:
    """Write files to *uploads_dir* with the same behaviour as the thread uploads API.

    Each item is ``(raw_filename, content)``. Filenames are normalized here.

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

    return uploaded_files
