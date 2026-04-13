"""Notebook manager - core business logic for notebook operations."""

import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from deerflow.notebook.models import (
    Document,
    DocumentStatus,
    Notebook,
    NotebookSettings,
)
from deerflow.notebook.paths import NotebookPaths, get_notebook_paths
from deerflow.uploads.manager import delete_file_safe, normalize_filename
from deerflow.utils.file_conversion import CONVERTIBLE_EXTENSIONS

logger = logging.getLogger(__name__)


def generate_id(prefix: str = "id") -> str:
    """Generate a unique ID with a prefix."""
    # For thread IDs, use pure UUID format for LangGraph compatibility
    if prefix == "thread":
        return str(uuid.uuid4())
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class NotebookManager:
    """Manages notebook operations: CRUD, documents, threads."""

    def __init__(
        self,
        paths: NotebookPaths | None = None,
    ) -> None:
        self.paths = paths or get_notebook_paths()

    def create_notebook(
        self,
        title: str,
        description: str | None = None,
        tags: list[str] | None = None,
        owner_id: str | None = None,
    ) -> Notebook:
        """Create a new notebook."""
        notebook_id = generate_id("nb")
        now = time.time()

        notebook = Notebook(
            notebook_id=notebook_id,
            owner_id=owner_id,
            title=title,
            description=description,
            tags=tags or [],
            documents=[],
            thread_ids=[],
            created_at=now,
            updated_at=now,
            settings=NotebookSettings(),
        )

        self.paths.ensure_notebook_dirs(notebook_id)
        self._save_notebook(notebook)

        logger.info("Created notebook: %s (%s)", notebook_id, title)
        return notebook

    def get_notebook(self, notebook_id: str) -> Notebook:
        """Get a notebook by ID."""
        metadata_file = self.paths.notebook_metadata_file(notebook_id)
        if not metadata_file.exists():
            raise FileNotFoundError(f"Notebook not found: {notebook_id}")

        data = json.loads(metadata_file.read_text(encoding="utf-8"))
        return Notebook(**data)

    def list_notebooks(self, owner_id: str | None = None) -> list[Notebook]:
        """List notebooks, optionally restricted to an owner."""
        notebooks_dir = self.paths.notebooks_dir
        if not notebooks_dir.exists():
            return []

        notebooks = []
        for nb_dir in notebooks_dir.iterdir():
            if nb_dir.is_dir():
                metadata_file = nb_dir / "metadata.json"
                if metadata_file.exists():
                    try:
                        data = json.loads(metadata_file.read_text(encoding="utf-8"))
                        nb = Notebook(**data)
                        if owner_id is not None and nb.owner_id != owner_id:
                            continue
                        notebooks.append(nb)
                    except Exception as e:
                        logger.warning("Failed to load notebook %s: %s", nb_dir.name, e)

        return sorted(notebooks, key=lambda nb: nb.updated_at, reverse=True)

    def get_notebook_for_thread(self, thread_id: str) -> Notebook | None:
        """Find the notebook that contains a given thread_id."""
        for notebook in self.list_notebooks():
            if thread_id in notebook.thread_ids:
                return notebook
        return None

    def update_notebook(
        self,
        notebook_id: str,
        title: str | None = None,
        description: str | None = None,
        tags: list[str] | None = None,
        settings: NotebookSettings | None = None,
    ) -> Notebook:
        """Update a notebook's metadata."""
        notebook = self.get_notebook(notebook_id)

        if title is not None:
            notebook.title = title
        if description is not None:
            notebook.description = description
        if tags is not None:
            notebook.tags = tags
        if settings is not None:
            notebook.settings = settings

        notebook.updated_at = time.time()
        self._save_notebook(notebook)

        logger.info("Updated notebook: %s", notebook_id)
        return notebook

    def delete_notebook(self, notebook_id: str) -> None:
        """Delete a notebook and all its data."""
        # First, get the notebook to find associated threads
        try:
            notebook = self.get_notebook(notebook_id)
            # TODO: Delete associated DeerFlow threads
            for thread_id in notebook.thread_ids:
                pass  # Delegate to ThreadManager
        except FileNotFoundError:
            pass

        self.paths.delete_notebook_dir(notebook_id)
        logger.info("Deleted notebook: %s", notebook_id)

    def set_upload_thread_id(self, notebook_id: str, thread_id: str) -> None:
        """Persist the dedicated upload thread for notebook library uploads."""
        notebook = self.get_notebook(notebook_id)
        notebook.settings.upload_thread_id = thread_id
        # DO NOT add upload thread to thread_ids - it's a background system thread
        # not a user-facing conversation thread
        notebook.updated_at = time.time()
        self._save_notebook(notebook)

    def _document_from_upload_path(self, notebook_id: str, path: Path) -> Document:
        st = path.stat()
        suffix = path.suffix.lower()
        file_type = suffix[1:] if suffix else "unknown"
        fn = path.name
        return Document(
            doc_id=fn,
            original_filename=fn,
            file_type=file_type,
            file_size=st.st_size,
            title=fn,
            status=DocumentStatus.READY,
            created_at=st.st_mtime,
            updated_at=st.st_mtime,
        )

    def list_documents(self, notebook_id: str) -> list[Document]:
        """List uploads in the notebook's shared user-data/uploads directory."""
        uploads = self.paths.uploads_dir(notebook_id)
        if not uploads.exists():
            return []
        out: list[Document] = []
        for p in sorted(uploads.iterdir(), key=lambda x: x.name.lower()):
            if p.name.startswith(".") or not p.is_file():
                continue
            try:
                out.append(self._document_from_upload_path(notebook_id, p))
            except OSError:
                logger.warning("Skipping unreadable upload path %s", p)
        return out

    def get_document(self, notebook_id: str, doc_id: str) -> Document:
        """Resolve a document by upload filename (doc_id is the on-disk basename)."""
        safe = normalize_filename(unquote(doc_id))
        path = self.paths.uploads_dir(notebook_id) / safe
        if not path.is_file():
            raise FileNotFoundError(f"Document not found: {doc_id}")
        return self._document_from_upload_path(notebook_id, path)

    def _rename_markdown_sidecars(self, uploads_dir: Path, old_name: str, new_name: str) -> None:
        """Rename markdown companions for both legacy and mnd_ naming conventions."""
        old_stem = Path(old_name).stem
        new_stem = Path(new_name).stem

        legacy_old = uploads_dir / f"{old_stem}.md"
        legacy_new = uploads_dir / f"{new_stem}.md"
        if legacy_old.is_file() and not legacy_new.exists():
            legacy_old.rename(legacy_new)

        mnd_old = uploads_dir / f"mnd_{old_stem}.md"
        mnd_new = uploads_dir / f"mnd_{new_stem}.md"
        if mnd_old.is_file() and not mnd_new.exists():
            mnd_old.rename(mnd_new)

    def rename_document(self, notebook_id: str, doc_id: str, title: str) -> Document:
        """Rename an upload by changing its on-disk filename and returning updated metadata."""
        safe_old = normalize_filename(unquote(doc_id))
        safe_title = normalize_filename(title.strip())

        uploads_dir = self.paths.uploads_dir(notebook_id)
        source = uploads_dir / safe_old
        if not source.is_file():
            raise FileNotFoundError(f"Document not found: {doc_id}")

        old_suffix = Path(safe_old).suffix
        # Keep original extension stable; title is only the display stem input.
        next_stem = Path(safe_title).stem
        if not next_stem:
            raise ValueError("Title cannot be empty")
        safe_new = f"{next_stem}{old_suffix}"

        if safe_new == safe_old:
            return self.get_document(notebook_id, safe_old)

        target = uploads_dir / safe_new
        if target.exists():
            raise FileExistsError(f"Document already exists: {safe_new}")

        source.rename(target)
        self._rename_markdown_sidecars(uploads_dir, safe_old, safe_new)

        logger.info("Renamed upload %s -> %s in notebook %s", safe_old, safe_new, notebook_id)
        return self._document_from_upload_path(notebook_id, target)

    def delete_document(self, notebook_id: str, doc_id: str) -> None:
        """Delete an upload (and companion .md when applicable)."""
        safe = normalize_filename(unquote(doc_id))
        uploads_dir = self.paths.uploads_dir(notebook_id)
        delete_file_safe(
            uploads_dir,
            safe,
            convertible_extensions=CONVERTIBLE_EXTENSIONS,
        )
        # Also clean up current conversion naming convention: mnd_<stem>.md
        (uploads_dir / f"mnd_{Path(safe).stem}.md").unlink(missing_ok=True)
        logger.info("Deleted upload %s from notebook %s", safe, notebook_id)

    def get_document_processing_status(self, notebook_id: str, doc_id: str) -> dict[str, Any]:
        """Upload pipeline runs synchronously; files are ready once present."""
        try:
            doc = self.get_document(notebook_id, doc_id)
            return {
                "status": doc.status.value,
                "error": doc.error_message,
                "outline_count": len(doc.outline),
            }
        except FileNotFoundError:
            return {"status": "not_found", "error": None, "outline_count": None}

    def create_thread(
        self,
        notebook_id: str,
        title: str | None = None,
        thread_id_override: str | None = None,
    ) -> str:
        """Create a new chat thread in a notebook."""
        notebook = self.get_notebook(notebook_id)

        if thread_id_override:
            thread_id = thread_id_override
            # Don't add if already exists
            if thread_id not in notebook.thread_ids:
                notebook.thread_ids.append(thread_id)
        else:
            thread_id = generate_id("thread")
            notebook.thread_ids.append(thread_id)

        # TODO: Actually create the DeerFlow thread if not already created
        # For now, just track the ID
        notebook.updated_at = time.time()
        self._save_notebook(notebook)

        logger.info("Created thread %s in notebook %s", thread_id, notebook_id)
        return thread_id

    def list_threads(self, notebook_id: str) -> list[str]:
        """List all threads in a notebook."""
        notebook = self.get_notebook(notebook_id)
        return notebook.thread_ids

    def read_document_content(self, notebook_id: str, doc_id: str) -> str | None:
        """Read markdown: either the file itself if .md, or a sidecar .md from conversion."""
        safe = normalize_filename(unquote(doc_id))
        base = self.paths.uploads_dir(notebook_id) / safe
        if not base.exists():
            return None
        if safe.lower().endswith(".md"):
            return base.read_text(encoding="utf-8")
        md = base.with_suffix(".md")
        if md.is_file():
            return md.read_text(encoding="utf-8")
        return None

    def _save_notebook(self, notebook: Notebook) -> None:
        """Save notebook metadata to disk."""
        metadata_file = self.paths.notebook_metadata_file(notebook.notebook_id)
        metadata_file.parent.mkdir(parents=True, exist_ok=True)
        metadata_file.write_text(
            notebook.model_dump_json(indent=2),
            encoding="utf-8",
        )


# Singleton
_notebook_manager: NotebookManager | None = None


def get_notebook_manager() -> NotebookManager:
    """Return the global NotebookManager singleton."""
    global _notebook_manager
    if _notebook_manager is None:
        _notebook_manager = NotebookManager()
    return _notebook_manager
