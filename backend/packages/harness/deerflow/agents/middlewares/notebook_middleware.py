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

logger = logging.getLogger(__name__)

# Patterns for @document references
# Matches: @doc_abc123  or  @[Document Title](doc_abc123)
DOC_REF_PATTERN = re.compile(
    r'@(?:(doc_[a-zA-Z0-9]+)|\[([^\]]+)\]\((doc_[a-zA-Z0-9]+)\))'
)


class NotebookMiddlewareState(AgentState):
    """State schema for notebook middleware."""

    notebook_id: NotRequired[str | None]


class NotebookMiddleware(AgentMiddleware[NotebookMiddlewareState]):
    """
    Middleware that detects @document references and injects document context.

    Looks for @doc_id references in the last human message and injects
    relevant document context into the conversation context.

    Documents are available in the sandbox at:
        /mnt/notebook/{notebook_id}/documents/{doc_id}/converted.md
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
        doc_ids = []
        matches = DOC_REF_PATTERN.finditer(content)

        for match in matches:
            # Group 1: @doc_abc123 format
            # Groups 2-3: @[Title](doc_abc123) format
            if match.group(1):
                doc_ids.append(match.group(1))
            elif match.group(3):
                doc_ids.append(match.group(3))

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
        import re
        lines = []
        lines.append(f"\n{'='*60}")
        lines.append(f"NOTEBOOK: {notebook.title}")
        lines.append(f"{'='*60}")
        lines.append("\nAvailable documents in this notebook:")

        ready_docs = [d for d in documents if d.status.value == "ready"]
        processing_docs = [d for d in documents if d.status.value in ("pending", "processing")]

        if ready_docs:
            lines.append(f"\nReady ({len(ready_docs)}):")
            for doc in ready_docs:
                safe_title = re.sub(r'[^\w\-_.() ]', '_', doc.title)
                title_link = f"/mnt/notebook/{notebook.notebook_id}/documents/_by_title/{doc.doc_id}_{safe_title}.md"
                lines.append(f"  - @{doc.title} ({doc.doc_id})")
                lines.append(f"    Use @{doc.doc_id} or @[{doc.title}]({doc.doc_id}) to reference")
                lines.append(f"    Or read by title: {title_link}")
                lines.append(f"    Or read by ID: /mnt/notebook/{notebook.notebook_id}/documents/{doc.doc_id}/converted.md")
                if doc.outline:
                    lines.append(f"    {len(doc.outline)} sections, {doc.stats.word_count or 0} words")

        if processing_docs:
            lines.append(f"\nProcessing ({len(processing_docs)}):")
            for doc in processing_docs:
                lines.append(f"  - {doc.title} ({doc.doc_id}) - {doc.status.value}")

        lines.append(f"\n{'='*60}\n")
        return "\n".join(lines)

    def _build_document_context(self, doc: Any, md_content: str, notebook_id: str) -> str:
        """Build a context section for a document."""
        lines = []
        lines.append(f"\n{'='*60}")
        lines.append(f"DOCUMENT: @{doc.title} ({doc.doc_id})")
        lines.append(f"{'='*60}")
        lines.append(f"Path: /mnt/notebook/{notebook_id}/documents/{doc.doc_id}/converted.md")

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

        # Get notebook_id from runtime context or configurable
        notebook_id = None
        runtime_context = runtime.context or {}

        if "notebook_id" in runtime_context:
            notebook_id = runtime_context["notebook_id"]

        if not notebook_id:
            # Try to get from configurable
            try:
                cfg = get_config()
                notebook_id = cfg.get("configurable", {}).get("notebook_id")
            except RuntimeError:
                pass  # get_config() raises outside a runnable context

        # Extract document references from message content
        content = last_message.content
        if not isinstance(content, str):
            return None

        referenced_doc_ids = self._extract_doc_ids(content)

        # Build context sections
        context_sections = []
        notebook_docs = []

        try:
            # If we have a notebook_id, always list all available documents
            if notebook_id:
                try:
                    notebook = self.manager.get_notebook(notebook_id)
                    notebook_docs = notebook.documents
                    logger.info(
                        "Notebook %s has %d documents total",
                        notebook_id,
                        len(notebook_docs),
                    )
                except FileNotFoundError:
                    logger.warning("Notebook %s not found", notebook_id)

            # If no notebook_id specified but we have referenced docs, search all notebooks
            notebooks_to_search = []
            if notebook_id:
                try:
                    notebooks_to_search.append(self.manager.get_notebook(notebook_id))
                except FileNotFoundError:
                    pass
            elif referenced_doc_ids:
                # Search all notebooks for referenced docs
                notebooks_to_search = self.manager.list_notebooks()
                if notebooks_to_search:
                    logger.info("No notebook_id specified, searching all %d notebooks", len(notebooks_to_search))

            # Add notebook documents listing if we have a notebook
            if notebook_docs:
                context_sections.append(self._build_notebook_docs_listing(notebook, notebook_docs))

            # Process referenced documents
            for doc_id in referenced_doc_ids:
                # Find the document in one of the notebooks
                doc = None
                found_notebook_id = None
                for notebook_candidate in notebooks_to_search:
                    candidate = notebook_candidate.get_document(doc_id)
                    if candidate:
                        doc = candidate
                        found_notebook_id = notebook_candidate.notebook_id
                        break

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
                    doc_context = self._build_document_context(doc, md_content, found_notebook_id)
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
