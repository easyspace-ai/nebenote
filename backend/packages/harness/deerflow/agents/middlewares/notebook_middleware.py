"""Notebook Middleware - handles @document references in chat."""

import asyncio
import logging
import re
from typing import Any, NotRequired, override

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage
from langgraph.config import get_config
from langgraph.runtime import Runtime

from deerflow.notebook import get_notebook_manager, get_notebook_paths
from deerflow.uploads.manager import upload_virtual_path

logger = logging.getLogger(__name__)

# Patterns for @document references
# Matches: @doc_abc123  or  @[Document Title](doc_abc123)  or  @[Title](file.pdf)
DOC_REF_PATTERN = re.compile(
    r'@(?:(doc_[a-zA-Z0-9]+)|\[([^\]]+)\]\(([^)]+)\))'
)


class NotebookMiddlewareState(AgentState):
    """State schema for notebook middleware."""

    notebook_id: NotRequired[str | None]


class NotebookMiddleware(AgentMiddleware[NotebookMiddlewareState]):
    """
    Middleware that detects @document references and injects document context.

    Looks for @doc_id references in the last human message and injects
    relevant document context into the conversation context.

    Notebook library files live in the shared uploads folder (same as chat uploads), e.g.
    ``/mnt/user-data/uploads/<filename>`` in the sandbox.
    """

    state_schema = NotebookMiddlewareState

    def __init__(
        self,
        paths: Any = None,
    ):
        super().__init__()
        self.paths = paths or get_notebook_paths()
        self.manager = get_notebook_manager()

    def _extract_doc_ids(self, content: str) -> list[str]:
        """Extract document IDs from @document references."""
        from pathlib import Path as _Path

        doc_ids = []
        matches = DOC_REF_PATTERN.finditer(content)

        for match in matches:
            # Group 1: @doc_abc123 format
            # Groups 2-3: @[Title](doc_abc123 or filename) format
            if match.group(1):
                doc_ids.append(match.group(1))
            elif match.group(3):
                doc_ids.append(_Path(match.group(3).strip()).name)

        # Deduplicate while preserving order
        seen = set()
        unique_ids = []
        for did in doc_ids:
            if did not in seen:
                seen.add(did)
                unique_ids.append(did)

        return unique_ids

    def _build_notebook_docs_listing(self, notebook: Any, documents: list[Any]) -> str:
        """Build a listing of all documents in the notebook."""
        lines = []
        lines.append(f"\n{'='*60}")
        lines.append(f"NOTEBOOK: {notebook.title}")
        lines.append(f"{'='*60}")
        lines.append(
            "Notebook files are stored alongside chat uploads under the shared uploads directory; "
            "in the sandbox they appear under /mnt/user-data/uploads/."
        )
        lines.append("\nAvailable files in this notebook:")

        ready_docs = [d for d in documents if d.status.value == "ready"]

        if ready_docs:
            lines.append(f"\nReady ({len(ready_docs)}):")
            for doc in ready_docs:
                vpath = upload_virtual_path(doc.doc_id)
                lines.append(f"  - @{doc.title} ({doc.doc_id})")
                lines.append(f"    Use @{doc.doc_id} or @[{doc.title}]({doc.doc_id}) to reference")
                lines.append(f"    Path: {vpath}")

        lines.append(f"\n{'='*60}\n")
        return "\n".join(lines)

    def _build_document_context(self, doc: Any, md_content: str) -> str:
        """Build a context section for a document."""
        lines = []
        lines.append(f"\n{'='*60}")
        lines.append(f"DOCUMENT: @{doc.title} ({doc.doc_id})")
        lines.append(f"{'='*60}")
        lines.append(f"Path: {upload_virtual_path(doc.doc_id)}")

        if doc.outline:
            lines.append("\nDocument Outline:")
            for item in doc.outline[:20]:  # Show first 20 outline items
                lines.append(f"  - {item.title}")
            if len(doc.outline) > 20:
                lines.append(f"  ... (and {len(doc.outline) - 20} more)")

        # Show first 3000 chars of content
        preview_length = min(len(md_content), 3000)
        preview = md_content[:preview_length]
        if len(md_content) > preview_length:
            preview += "\n\n[... content truncated - use read_file to read more ...]"

        lines.append("\nDocument Content Preview:")
        lines.append(preview)
        lines.append(f"\n{'='*60}\n")

        return "\n".join(lines)

    def _inject_context(self, original_content: str, context: str) -> str:
        """Inject document context into the message."""
        return (
            f"{original_content}\n\n"
            f"---\n\n"
            f"Referenced Document Context:\n"
            f"{context}"
        )

    def _prepare_context(
        self,
        state: NotebookMiddlewareState,
        runtime: Runtime,
    ) -> dict | None:
        """Inject document context before agent execution.

        Args:
            state: Current agent state.
            runtime: Runtime context containing thread_id and notebook_id.

        Returns:
            State updates, or None if no changes needed.
        """
        messages = list(state.get("messages", []))
        if not messages:
            return None

        last_message_index = len(messages) - 1
        last_message = messages[last_message_index]

        if not isinstance(last_message, HumanMessage):
            return None

        # Get notebook_id from runtime context, configurable, or thread membership
        notebook_id = None
        runtime_context = runtime.context or {}
        thread_id = runtime_context.get("thread_id")

        if "notebook_id" in runtime_context:
            notebook_id = runtime_context["notebook_id"]

        if not notebook_id:
            # Try to get from configurable
            try:
                cfg = get_config()
                notebook_id = cfg.get("configurable", {}).get("notebook_id")
                if not thread_id:
                    thread_id = cfg.get("configurable", {}).get("thread_id")
            except RuntimeError:
                pass  # get_config() raises outside a runnable context

        if not notebook_id and thread_id:
            nb = self.manager.get_notebook_for_thread(thread_id)
            if nb:
                notebook_id = nb.notebook_id

        # Extract document references from message content
        content = last_message.content
        if not isinstance(content, str):
            return None

        referenced_doc_ids = self._extract_doc_ids(content)

        # Build context sections
        context_sections = []
        notebook_docs = []

        try:
            notebook = None
            if notebook_id:
                try:
                    notebook = self.manager.get_notebook(notebook_id)
                    notebook_docs = self.manager.list_documents(notebook_id)
                    logger.info(
                        "Notebook %s has %d uploads listed",
                        notebook_id,
                        len(notebook_docs),
                    )
                except FileNotFoundError:
                    logger.warning("Notebook %s not found", notebook_id)
                    notebook_docs = []

            elif referenced_doc_ids:
                logger.info(
                    "Document references present but no notebook context; skipping (no cross-notebook lookup)"
                )

            if notebook_id and notebook and notebook_docs:
                context_sections.append(self._build_notebook_docs_listing(notebook, notebook_docs))

            # Process referenced documents (only inside current notebook)
            for doc_id in referenced_doc_ids:
                doc = None
                found_notebook_id = notebook_id
                if notebook_id:
                    try:
                        doc = self.manager.get_document(notebook_id, doc_id)
                    except FileNotFoundError:
                        doc = None

                if not doc:
                    context_sections.append(
                        f"\n[Note: Document {doc_id} not found.]\n"
                    )
                    continue

                if doc.status.value != "ready":
                    context_sections.append(
                        f"\n[Note: Document @{doc.title} ({doc_id}) is still processing (status: {doc.status.value}).]\n"
                    )
                    continue

                # Read converted Markdown content
                md_content = self.manager.read_document_content(found_notebook_id, doc_id)
                if md_content:
                    doc_context = self._build_document_context(doc, md_content)
                    context_sections.append(doc_context)
                else:
                    context_sections.append(
                        f"\n[Note: Document @{doc.title} ({doc_id}) has no content available.]\n"
                    )

        except Exception:
            logger.exception("Failed to load document context")
            context_sections.append("\n[Error loading document context]\n")

        if not context_sections:
            return None

        # Inject context into the message
        augmented_content = self._inject_context(
            content,
            "\n".join(context_sections)
        )

        # Create new message with augmented content
        updated_message = HumanMessage(
            content=augmented_content,
            id=last_message.id,
            additional_kwargs=last_message.additional_kwargs,
        )

        messages[last_message_index] = updated_message

        return {
            "notebook_id": notebook_id,
            "messages": messages,
        }

    @override
    def before_agent(self, state: NotebookMiddlewareState, runtime: Runtime) -> dict | None:
        return self._prepare_context(state, runtime)

    @override
    async def abefore_agent(self, state: NotebookMiddlewareState, runtime: Runtime) -> dict | None:
        return await asyncio.to_thread(self._prepare_context, state, runtime)
