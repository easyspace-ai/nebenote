"""Thread ACL: map sessions (threads) to authenticated users."""

from __future__ import annotations

import logging

from fastapi import HTTPException, Request

from app.gateway.deps import get_store
from app.gateway.routers.auth import User
from deerflow.notebook import get_notebook_manager

logger = logging.getLogger(__name__)

THREADS_NS = ("threads",)


async def _store_get_thread(request: Request, thread_id: str) -> dict | None:
    store = get_store(request)
    if store is None:
        return None
    item = await store.aget(THREADS_NS, thread_id)
    return item.value if item is not None else None


def user_may_access_thread_metadata(metadata: dict | None, user_id: str) -> bool:
    """Return True if metadata grants access (direct owner or notebook owner)."""
    if not metadata:
        return False
    if metadata.get("user_id") == user_id:
        return True
    nb_id = metadata.get("notebook_id")
    if nb_id:
        try:
            nb = get_notebook_manager().get_notebook(nb_id)
        except FileNotFoundError:
            return False
        return nb.owner_id == user_id
    return False


async def require_thread_access(request: Request, thread_id: str, user: User) -> None:
    """Ensure the current user may access thread data; raise 404 if not (no existence leak)."""
    record = await _store_get_thread(request, thread_id)
    if record is not None:
        meta = record.get("metadata") or {}
        if user_may_access_thread_metadata(meta, user.id):
            return
        raise HTTPException(status_code=404, detail="Thread not found")

    notebook = get_notebook_manager().get_notebook_for_thread(thread_id)
    if notebook is not None:
        if notebook.owner_id == user.id:
            return
        raise HTTPException(status_code=404, detail="Thread not found")

    checkpointer = getattr(request.app.state, "checkpointer", None)
    if checkpointer is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}
    try:
        checkpoint_tuple = await checkpointer.aget_tuple(config)
    except Exception:
        logger.exception("Thread ACL checkpointer read failed for %s", thread_id)
        raise HTTPException(status_code=404, detail="Thread not found")

    if checkpoint_tuple is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    ckpt_meta = getattr(checkpoint_tuple, "metadata", {}) or {}
    user_meta = {
        k: v
        for k, v in ckpt_meta.items()
        if k not in ("created_at", "updated_at", "step", "source", "writes", "parents")
    }
    if user_may_access_thread_metadata(user_meta, user.id):
        return
    raise HTTPException(status_code=404, detail="Thread not found")
