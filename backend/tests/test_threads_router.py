from unittest.mock import patch
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.gateway.routers import threads
from deerflow.config.paths import Paths
from deerflow.notebook.manager import NotebookManager


class InMemoryStore:
    def __init__(self):
        self.records = {}

    async def aget(self, namespace, key):
        value = self.records.get((tuple(namespace), key))
        if value is None:
            return None
        return SimpleNamespace(value=value)

    async def aput(self, namespace, key, value):
        self.records[(tuple(namespace), key)] = value

    async def adelete(self, namespace, key):
        self.records.pop((tuple(namespace), key), None)


class FakeCheckpointTuple:
    def __init__(self, thread_id, checkpoint, metadata, checkpoint_id="checkpoint-1"):
        self.config = {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": "",
                "checkpoint_id": checkpoint_id,
            }
        }
        self.parent_config = None
        self.checkpoint = checkpoint
        self.metadata = metadata
        self.tasks = []
        self.pending_writes = []


class InMemoryCheckpointer:
    def __init__(self):
        self.records = {}

    async def aget_tuple(self, config):
        thread_id = config.get("configurable", {}).get("thread_id")
        return self.records.get(thread_id)

    async def aput(self, config, checkpoint, metadata, _writes):
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = f"checkpoint-{len(self.records) + 1}"
        self.records[thread_id] = FakeCheckpointTuple(
            thread_id=thread_id,
            checkpoint=checkpoint,
            metadata=metadata,
            checkpoint_id=checkpoint_id,
        )
        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": "",
                "checkpoint_id": checkpoint_id,
            }
        }

    async def alist(self, config=None, limit=10):
        thread_id = None
        if config:
            thread_id = config.get("configurable", {}).get("thread_id")

        records = list(self.records.values())
        if thread_id is not None:
            records = [record for record in records if record.config["configurable"]["thread_id"] == thread_id]

        for record in records[:limit]:
            yield record


def test_delete_thread_data_removes_thread_directory(tmp_path):
    paths = Paths(tmp_path)
    thread_dir = paths.thread_dir("thread-cleanup")
    workspace = paths.sandbox_work_dir("thread-cleanup")
    uploads = paths.sandbox_uploads_dir("thread-cleanup")
    outputs = paths.sandbox_outputs_dir("thread-cleanup")

    for directory in [workspace, uploads, outputs]:
        directory.mkdir(parents=True, exist_ok=True)
    (workspace / "notes.txt").write_text("hello", encoding="utf-8")
    (uploads / "report.pdf").write_bytes(b"pdf")
    (outputs / "result.json").write_text("{}", encoding="utf-8")

    assert thread_dir.exists()

    response = threads._delete_thread_data("thread-cleanup", paths=paths)

    assert response.success is True
    assert not thread_dir.exists()


def test_delete_thread_data_is_idempotent_for_missing_directory(tmp_path):
    paths = Paths(tmp_path)

    response = threads._delete_thread_data("missing-thread", paths=paths)

    assert response.success is True
    assert not paths.thread_dir("missing-thread").exists()


def test_delete_thread_data_rejects_invalid_thread_id(tmp_path):
    paths = Paths(tmp_path)

    with pytest.raises(HTTPException) as exc_info:
        threads._delete_thread_data("../escape", paths=paths)

    assert exc_info.value.status_code == 422
    assert "Invalid thread_id" in exc_info.value.detail


def test_delete_thread_route_cleans_thread_directory(tmp_path):
    paths = Paths(tmp_path)
    thread_dir = paths.thread_dir("thread-route")
    paths.sandbox_work_dir("thread-route").mkdir(parents=True, exist_ok=True)
    (paths.sandbox_work_dir("thread-route") / "notes.txt").write_text("hello", encoding="utf-8")

    app = FastAPI()
    app.include_router(threads.router)

    with patch("app.gateway.routers.threads.get_paths", return_value=paths):
        with TestClient(app) as client:
            response = client.delete("/api/threads/thread-route")

    assert response.status_code == 200
    assert response.json() == {"success": True, "message": "Deleted local thread data for thread-route"}
    assert not thread_dir.exists()


def test_delete_thread_route_rejects_invalid_thread_id(tmp_path):
    paths = Paths(tmp_path)

    app = FastAPI()
    app.include_router(threads.router)

    with patch("app.gateway.routers.threads.get_paths", return_value=paths):
        with TestClient(app) as client:
            response = client.delete("/api/threads/../escape")

    assert response.status_code == 404


def test_delete_thread_route_returns_422_for_route_safe_invalid_id(tmp_path):
    paths = Paths(tmp_path)

    app = FastAPI()
    app.include_router(threads.router)

    with patch("app.gateway.routers.threads.get_paths", return_value=paths):
        with TestClient(app) as client:
            response = client.delete("/api/threads/thread.with.dot")

    assert response.status_code == 422
    assert "Invalid thread_id" in response.json()["detail"]


def test_delete_thread_data_returns_generic_500_error(tmp_path):
    paths = Paths(tmp_path)

    with (
        patch.object(paths, "delete_thread_dir", side_effect=OSError("/secret/path")),
        patch.object(threads.logger, "exception") as log_exception,
    ):
        with pytest.raises(HTTPException) as exc_info:
            threads._delete_thread_data("thread-cleanup", paths=paths)

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "Failed to delete local thread data."
    assert "/secret/path" not in exc_info.value.detail
    log_exception.assert_called_once_with("Failed to delete thread data for %s", "thread-cleanup")


def test_history_route_materializes_legacy_notebook_thread(tmp_path):
    app = FastAPI()
    app.include_router(threads.router)
    app.state.store = InMemoryStore()
    app.state.checkpointer = InMemoryCheckpointer()

    notebook_manager = NotebookManager()
    notebook_manager.paths = notebook_manager.paths.__class__(tmp_path)
    notebook = notebook_manager.create_notebook(title="Notebook")
    legacy_thread_id = notebook_manager.create_thread(notebook.notebook_id, thread_id_override="legacy-thread")

    with (
        patch("app.gateway.routers.threads.get_notebook_manager", return_value=notebook_manager),
        TestClient(app) as client,
    ):
        response = client.post(
            f"/api/threads/{legacy_thread_id}/history",
            json={"limit": 10},
        )

    assert response.status_code == 200
    history = response.json()
    assert len(history) == 1
    assert history[0]["metadata"]["notebook_id"] == notebook.notebook_id

    record = app.state.store.records[(("threads",), legacy_thread_id)]
    assert record["metadata"]["notebook_id"] == notebook.notebook_id
