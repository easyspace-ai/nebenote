"""Path configuration for Notebook system."""

import re
from pathlib import Path

_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9._-]+$")


def _validate_id(id_value: str, id_type: str = "id") -> str:
    """Validate an ID before using it in filesystem paths."""
    if not _SAFE_ID_RE.match(id_value):
        raise ValueError(
            f"Invalid {id_type} {id_value!r}: "
            "only alphanumeric characters, hyphens, and underscores are allowed."
        )
    return id_value


class NotebookPaths:
    """
    Centralized path configuration for Notebook data.

    Directory layout:
        {base_dir}/
        └── notebooks/
            └── {notebook_id}/
                ├── metadata.json           # Notebook metadata
                ├── documents/              # Document storage
                │   └── {doc_id}/
                │       ├── original.{ext}  # Original file
                │       ├── converted.md    # Converted Markdown
                │       ├── outline.json    # Document outline
                │       ├── chunks.json     # Semantic chunks (optional)
                │       └── metadata.json   # Document metadata
                ├── user-data/              # Unified user data for ALL threads in this notebook
                │   ├── workspace/          # Workspace directory (shared)
                │   ├── uploads/            # Uploads directory (shared)
                │   └── outputs/            # Outputs directory (shared)
                ├── threads/                # Chat threads (DeerFlow threads)
                │   └── {thread_id}/        # Standard DeerFlow thread dir
                └── assets/                 # Generated assets (PPT, HTML, etc.)
                    ├── {asset_id}.pptx
                    └── {asset_id}.html
    """

    def __init__(self, base_dir: Path | str | None = None) -> None:
        from deerflow.config.paths import get_paths as get_deerflow_paths
        self._base_dir = Path(base_dir) if base_dir else get_deerflow_paths().base_dir

    @property
    def notebooks_dir(self) -> Path:
        """Root directory for all notebooks: {base_dir}/notebooks/"""
        return self._base_dir / "notebooks"

    def notebook_dir(self, notebook_id: str) -> Path:
        """Directory for a specific notebook."""
        return self.notebooks_dir / _validate_id(notebook_id, "notebook_id")

    def notebook_metadata_file(self, notebook_id: str) -> Path:
        """Metadata file for a notebook."""
        return self.notebook_dir(notebook_id) / "metadata.json"

    def documents_dir(self, notebook_id: str) -> Path:
        """Directory containing all documents in a notebook."""
        return self.notebook_dir(notebook_id) / "documents"

    def uploads_dir(self, notebook_id: str) -> Path:
        """Directory containing uploads for ALL threads in a notebook."""
        return self.notebook_dir(notebook_id) / "user-data" / "uploads"

    def user_data_dir(self, notebook_id: str) -> Path:
        """Directory containing unified user data for a notebook."""
        return self.notebook_dir(notebook_id) / "user-data"

    def workspace_dir(self, notebook_id: str) -> Path:
        """Directory containing workspace for ALL threads in a notebook."""
        return self.notebook_dir(notebook_id) / "user-data" / "workspace"

    def outputs_dir(self, notebook_id: str) -> Path:
        """Directory containing outputs for ALL threads in a notebook."""
        return self.notebook_dir(notebook_id) / "user-data" / "outputs"

    def document_dir(self, notebook_id: str, doc_id: str) -> Path:
        """Directory for a specific document."""
        return (
            self.documents_dir(notebook_id)
            / _validate_id(doc_id, "doc_id")
        )

    def document_metadata_file(self, notebook_id: str, doc_id: str) -> Path:
        """Metadata file for a document."""
        return self.document_dir(notebook_id, doc_id) / "metadata.json"

    def document_original_file(self, notebook_id: str, doc_id: str, extension: str) -> Path:
        """Path to the original uploaded file."""
        ext = extension if extension.startswith(".") else f".{extension}"
        return self.document_dir(notebook_id, doc_id) / f"original{ext}"

    def document_converted_file(self, notebook_id: str, doc_id: str) -> Path:
        """Path to the converted Markdown file."""
        return self.document_dir(notebook_id, doc_id) / "converted.md"

    def document_outline_file(self, notebook_id: str, doc_id: str) -> Path:
        """Path to the document outline JSON."""
        return self.document_dir(notebook_id, doc_id) / "outline.json"

    def document_chunks_file(self, notebook_id: str, doc_id: str) -> Path:
        """Path to the semantic chunks JSON."""
        return self.document_dir(notebook_id, doc_id) / "chunks.json"

    def threads_dir(self, notebook_id: str) -> Path:
        """Directory containing thread references for a notebook."""
        return self.notebook_dir(notebook_id) / "threads"

    def assets_dir(self, notebook_id: str) -> Path:
        """Directory containing generated assets for a notebook."""
        return self.notebook_dir(notebook_id) / "assets"

    def asset_file(self, notebook_id: str, asset_id: str, extension: str) -> Path:
        """Path to a generated asset file."""
        ext = extension if extension.startswith(".") else f".{extension}"
        return self.assets_dir(notebook_id) / f"{asset_id}{ext}"

    def ensure_notebook_dirs(self, notebook_id: str) -> None:
        """Create all standard directories for a notebook."""
        for d in [
            self.documents_dir(notebook_id),
            self.user_data_dir(notebook_id),
            self.workspace_dir(notebook_id),
            self.uploads_dir(notebook_id),
            self.outputs_dir(notebook_id),
            self.threads_dir(notebook_id),
            self.assets_dir(notebook_id),
        ]:
            d.mkdir(parents=True, exist_ok=True)
            d.chmod(0o777)

    def ensure_document_dirs(self, notebook_id: str, doc_id: str) -> None:
        """Create all directories for a document."""
        doc_dir = self.document_dir(notebook_id, doc_id)
        doc_dir.mkdir(parents=True, exist_ok=True)
        doc_dir.chmod(0o777)

    def delete_notebook_dir(self, notebook_id: str) -> None:
        """Delete all data for a notebook (idempotent)."""
        import shutil
        nb_dir = self.notebook_dir(notebook_id)
        if nb_dir.exists():
            shutil.rmtree(nb_dir)


# Singleton
_notebook_paths: NotebookPaths | None = None


def get_notebook_paths() -> NotebookPaths:
    """Return the global NotebookPaths singleton."""
    global _notebook_paths
    if _notebook_paths is None:
        _notebook_paths = NotebookPaths()
    return _notebook_paths
