"""Notebook library uploads use user-data/uploads (same pipeline as thread uploads)."""

import asyncio

from deerflow.notebook.manager import NotebookManager
from deerflow.notebook.paths import NotebookPaths


def test_list_documents_scans_uploads_dir(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "a.txt").write_text("hello")

    docs = mgr.list_documents(nb.notebook_id)
    assert len(docs) == 1
    assert docs[0].doc_id == "a.txt"
    assert docs[0].status.value == "ready"


def test_get_document_resolves_upload_filename(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "note.md").write_text("# Hi")

    doc = mgr.get_document(nb.notebook_id, "note.md")
    assert doc.doc_id == "note.md"


def test_delete_document_removes_file(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "x.txt").write_text("bye")
    mgr.delete_document(nb.notebook_id, "x.txt")
    assert not (udir / "x.txt").exists()


def test_process_upload_items_writes_to_notebook_uploads(tmp_path, monkeypatch):
    from deerflow.uploads.pipeline import process_upload_items

    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("NB")
    udir = paths.uploads_dir(nb.notebook_id)

    async def _noop_convert(_path):
        return None

    monkeypatch.setattr(
        "deerflow.uploads.pipeline.convert_file_to_markdown",
        _noop_convert,
    )
    monkeypatch.setattr(
        "deerflow.uploads.pipeline.get_sandbox_provider",
        lambda: type(
            "_SP",
            (),
            {
                "acquire": staticmethod(lambda _tid: "local"),
                "get": staticmethod(lambda _sid: None),
            },
        )(),
    )

    out = asyncio.run(
        process_upload_items(
            udir,
            "00000000-0000-0000-0000-000000000001",
            [("hello.txt", b"hello")],
            notebook_id=nb.notebook_id,
        )
    )
    assert len(out) == 1
    assert (udir / "hello.txt").read_bytes() == b"hello"
