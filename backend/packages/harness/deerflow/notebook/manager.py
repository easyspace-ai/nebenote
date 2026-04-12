"""Notebook manager - core business logic for notebook operations."""

import json
import logging
import re
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from deerflow.notebook.models import (
    Document,
    DocumentStatus,
    Notebook,
    NotebookSettings,
    OutlineItem,
)
from deerflow.notebook.paths import NotebookPaths, get_notebook_paths
from deerflow.utils.file_conversion import _do_convert, _get_pdf_converter, extract_outline

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
        max_workers: int = 4,
    ) -> None:
        self.paths = paths or get_notebook_paths()
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._processing_tasks: dict[str, dict[str, Any]] = {}

    def create_notebook(
        self,
        title: str,
        description: str | None = None,
        tags: list[str] | None = None,
    ) -> Notebook:
        """Create a new notebook."""
        notebook_id = generate_id("nb")
        now = time.time()

        notebook = Notebook(
            notebook_id=notebook_id,
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

    def list_notebooks(self) -> list[Notebook]:
        """List all notebooks."""
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
                        notebooks.append(Notebook(**data))
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

    def add_document(
        self,
        notebook_id: str,
        file_path: Path,
        original_filename: str,
        title: str | None = None,
    ) -> Document:
        """Add a document to a notebook (triggers async processing)."""
        logger.info(f"[Document Add] Adding document to notebook {notebook_id}: {original_filename}")

        notebook = self.get_notebook(notebook_id)
        doc_id = generate_id("doc")
        now = time.time()
        logger.debug(f"[Document Add] Generated doc_id: {doc_id}")

        # Determine file type
        suffix = Path(original_filename).suffix.lower()
        file_type = suffix[1:] if suffix else "unknown"
        logger.debug(f"[Document Add] File type: {file_type}, suffix: {suffix}")

        # Create document
        doc = Document(
            doc_id=doc_id,
            original_filename=original_filename,
            file_type=file_type,
            file_size=file_path.stat().st_size,
            title=title or original_filename,
            status=DocumentStatus.PENDING,
            created_at=now,
            updated_at=now,
        )
        logger.debug(f"[Document Add] Document object created with status: {doc.status}")

        # Save original file
        logger.debug(f"[Document Add] Ensuring document directories for {doc_id}")
        self.paths.ensure_document_dirs(notebook_id, doc_id)
        dest_path = self.paths.document_original_file(notebook_id, doc_id, suffix)
        logger.debug(f"[Document Add] Copying file to: {dest_path}")
        import shutil
        shutil.copy2(file_path, dest_path)
        logger.info(f"[Document Add] Original file saved to: {dest_path}")

        # Update notebook
        logger.debug(f"[Document Add] Updating notebook {notebook_id} with new document")
        notebook.documents.append(doc)
        notebook.updated_at = now
        self._save_notebook(notebook)
        self._save_document_metadata(notebook_id, doc)
        logger.debug("[Document Add] Notebook metadata saved")

        # Start async processing
        logger.info(f"[Document Add] Starting async processing for document {doc_id}")
        self._process_document_async(notebook_id, doc_id, dest_path)

        logger.info("Added document %s to notebook %s", doc_id, notebook_id)
        return doc

    def get_document(self, notebook_id: str, doc_id: str) -> Document:
        """Get a document from a notebook."""
        metadata_file = self.paths.document_metadata_file(notebook_id, doc_id)
        if not metadata_file.exists():
            raise FileNotFoundError(f"Document not found: {doc_id}")

        data = json.loads(metadata_file.read_text(encoding="utf-8"))
        return Document(**data)

    def list_documents(self, notebook_id: str) -> list[Document]:
        """List all documents in a notebook."""
        notebook = self.get_notebook(notebook_id)
        return notebook.documents

    def delete_document(self, notebook_id: str, doc_id: str) -> None:
        """Delete a document from a notebook."""
        notebook = self.get_notebook(notebook_id)

        # Remove from notebook
        notebook.documents = [d for d in notebook.documents if d.doc_id != doc_id]
        notebook.updated_at = time.time()
        self._save_notebook(notebook)

        # Delete files
        doc_dir = self.paths.document_dir(notebook_id, doc_id)
        if doc_dir.exists():
            import shutil
            shutil.rmtree(doc_dir)

        logger.info("Deleted document %s from notebook %s", doc_id, notebook_id)

    def get_document_processing_status(self, notebook_id: str, doc_id: str) -> dict[str, Any]:
        """Get the processing status of a document."""
        task_key = f"{notebook_id}_{doc_id}"
        if task_key in self._processing_tasks:
            return self._processing_tasks[task_key]

        try:
            doc = self.get_document(notebook_id, doc_id)
            return {
                "status": doc.status.value,
                "error": doc.error_message,
            }
        except FileNotFoundError:
            return {"status": "not_found"}

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
        """Read the converted Markdown content of a document."""
        md_file = self.paths.document_converted_file(notebook_id, doc_id)
        if md_file.exists():
            return md_file.read_text(encoding="utf-8")
        return None

    def _save_notebook(self, notebook: Notebook) -> None:
        """Save notebook metadata to disk."""
        metadata_file = self.paths.notebook_metadata_file(notebook.notebook_id)
        metadata_file.parent.mkdir(parents=True, exist_ok=True)
        metadata_file.write_text(
            notebook.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def _save_document_metadata(self, notebook_id: str, doc: Document) -> None:
        """Save document metadata to disk."""
        metadata_file = self.paths.document_metadata_file(notebook_id, doc.doc_id)
        metadata_file.write_text(
            doc.model_dump_json(indent=2),
            encoding="utf-8",
        )

    def _process_document_async(
        self,
        notebook_id: str,
        doc_id: str,
        file_path: Path,
    ) -> None:
        """Process a document asynchronously: convert to Markdown, extract outline, etc."""
        task_key = f"{notebook_id}_{doc_id}"
        self._processing_tasks[task_key] = {"status": "processing"}
        logger.info(f"[Document Processing] Starting async processing for doc {doc_id} in notebook {notebook_id}")

        def process():
            logger.info(f"[Document Processing] Thread started for doc {doc_id}")
            try:
                logger.debug(f"[Document Processing] Loading document metadata for {doc_id}")
                doc = self.get_document(notebook_id, doc_id)
                doc.status = DocumentStatus.PROCESSING
                self._save_document_metadata(notebook_id, doc)
                logger.info(f"[Document Processing] Marked document {doc_id} as PROCESSING")

                # Step 1: Convert to Markdown (synchronous)
                logger.info(f"[Document Processing] Starting Markdown conversion for {doc_id}")
                pdf_converter = _get_pdf_converter()
                logger.debug(f"[Document Processing] Using PDF converter: {pdf_converter}")
                text = _do_convert(file_path, pdf_converter)
                dest_md = self.paths.document_converted_file(notebook_id, doc_id)
                dest_md.write_text(text, encoding="utf-8")

                logger.info("Converted %s to markdown: %s (%d chars)", file_path.name, dest_md.name, len(text))

                # Step 2: Extract outline
                logger.info(f"[Document Processing] Extracting outline for {doc_id}")
                outline_data = extract_outline(dest_md)
                doc.outline = [
                    OutlineItem(title=item["title"], line=item["line"], level=1)
                    for item in outline_data
                    if not item.get("truncated")
                ]
                logger.info(f"[Document Processing] Extracted {len(doc.outline)} outline items for {doc_id}")

                # Save outline
                outline_file = self.paths.document_outline_file(notebook_id, doc_id)
                outline_file.write_text(
                    json.dumps([o.model_dump() for o in doc.outline], indent=2),
                    encoding="utf-8",
                )
                logger.debug(f"[Document Processing] Saved outline to {outline_file}")

                # Update stats
                logger.debug(f"[Document Processing] Calculating stats for {doc_id}")
                content = dest_md.read_text(encoding="utf-8")
                doc.stats.word_count = len(content.split())
                logger.debug(f"[Document Processing] Word count: {doc.stats.word_count}")

                # Mark as ready
                doc.status = DocumentStatus.READY
                doc.updated_at = time.time()
                logger.info(f"[Document Processing] Marking document {doc_id} as READY")

                # Create symbolic link with document title for easier access
                try:
                    docs_dir = self.paths.documents_dir(notebook_id)
                    by_title_dir = docs_dir / "_by_title"
                    by_title_dir.mkdir(parents=True, exist_ok=True)

                    # Create a safe filename from the title
                    safe_title = re.sub(r'[^\w\-_.() ]', '_', doc.title)
                    # Add doc_id prefix to avoid conflicts
                    link_name = f"{doc.doc_id}_{safe_title}.md"
                    link_path = by_title_dir / link_name

                    # Remove existing link if it exists
                    if link_path.exists():
                        link_path.unlink()

                    # Create symlink to the converted.md
                    target_path = Path("..") / doc_id / "converted.md"
                    link_path.symlink_to(target_path)

                    logger.info(f"[Document Processing] Created symlink: {link_name} -> {target_path}")
                except Exception as e:
                    logger.warning(f"[Document Processing] Failed to create title symlink: {e}")

                self._save_document_metadata(notebook_id, doc)

                # Update notebook
                logger.debug(f"[Document Processing] Updating notebook {notebook_id} with processed document")
                notebook = self.get_notebook(notebook_id)
                for i, d in enumerate(notebook.documents):
                    if d.doc_id == doc_id:
                        notebook.documents[i] = doc
                        break
                notebook.updated_at = time.time()
                self._save_notebook(notebook)

                self._processing_tasks[task_key] = {
                    "status": "ready",
                    "outline_count": len(doc.outline),
                }
                logger.info("Document %s processed successfully", doc_id)

            except Exception as e:
                logger.exception("Failed to process document %s", doc_id)
                try:
                    doc = self.get_document(notebook_id, doc_id)
                    doc.status = DocumentStatus.FAILED
                    doc.error_message = str(e)
                    self._save_document_metadata(notebook_id, doc)
                    logger.error(f"Document {doc_id} marked as FAILED: {e}")
                except Exception as inner_e:
                    logger.exception(f"Failed to update document status to FAILED: {inner_e}")
                    pass
                self._processing_tasks[task_key] = {
                    "status": "failed",
                    "error": str(e),
                }

        logger.debug(f"[Document Processing] Submitting task to executor for doc {doc_id}")
        self.executor.submit(process)


# Singleton
_notebook_manager: NotebookManager | None = None


def get_notebook_manager() -> NotebookManager:
    """Return the global NotebookManager singleton."""
    global _notebook_manager
    if _notebook_manager is None:
        _notebook_manager = NotebookManager()
    return _notebook_manager
