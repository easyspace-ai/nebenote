"""Notebook module - for managing notebooks with multiple documents and chat threads."""

from deerflow.notebook.manager import NotebookManager, get_notebook_manager
from deerflow.notebook.models import (
    Document,
    DocumentStats,
    DocumentStatus,
    Notebook,
    NotebookSettings,
    OutlineItem,
    ThreadInfo,
)
from deerflow.notebook.paths import NotebookPaths, get_notebook_paths

__all__ = [
    "Notebook",
    "Document",
    "DocumentStatus",
    "ThreadInfo",
    "NotebookSettings",
    "OutlineItem",
    "DocumentStats",
    "NotebookManager",
    "get_notebook_manager",
    "NotebookPaths",
    "get_notebook_paths",
]
