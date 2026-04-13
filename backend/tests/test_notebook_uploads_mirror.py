"""Notebook library uploads use user-data/uploads (same pipeline as thread uploads)."""

import asyncio

from deerflow.notebook.manager import NotebookManager
from deerflow.notebook.paths import NotebookPaths
from deerflow.uploads.pipeline import CONVERSION_ERROR_MARKER


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


def test_delete_document_removes_mnd_sidecar(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "x.pdf").write_text("pdf")
    (udir / "mnd_x.md").write_text("converted")

    mgr.delete_document(nb.notebook_id, "x.pdf")

    assert not (udir / "x.pdf").exists()
    assert not (udir / "mnd_x.md").exists()


def test_rename_document_renames_file_and_mnd_sidecar(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "old.pdf").write_text("pdf")
    (udir / "mnd_old.md").write_text("converted")

    doc = mgr.rename_document(nb.notebook_id, "old.pdf", "new-title")

    assert doc.doc_id == "new-title.pdf"
    assert (udir / "new-title.pdf").exists()
    assert not (udir / "old.pdf").exists()
    assert (udir / "mnd_new-title.md").exists()
    assert not (udir / "mnd_old.md").exists()


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


def test_list_documents_excludes_mnd_markdown_sidecar(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "book.pdf").write_text("pdf")
    (udir / "mnd_book.md").write_text("# converted")

    docs = mgr.list_documents(nb.notebook_id)
    assert [d.doc_id for d in docs] == ["book.pdf"]


def test_list_documents_skips_conversion_error_marker_files(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "a.pdf").write_text("pdf")
    (udir / f"a{CONVERSION_ERROR_MARKER}").write_text("boom")

    docs = mgr.list_documents(nb.notebook_id)
    assert [d.doc_id for d in docs] == ["a.pdf"]


def test_document_status_processing_until_mnd_exists(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "r.pdf").write_text("pdf")

    doc = mgr.get_document(nb.notebook_id, "r.pdf")
    assert doc.status.value == "processing"


def test_document_status_failed_when_conversion_error_marker(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "r.pdf").write_text("pdf")
    (udir / f"r{CONVERSION_ERROR_MARKER}").write_text("no pdf parser")

    doc = mgr.get_document(nb.notebook_id, "r.pdf")
    assert doc.status.value == "failed"
    assert doc.error_message == "no pdf parser"


def test_delete_document_removes_conversion_error_sidecar(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "x.pdf").write_text("pdf")
    (udir / f"x{CONVERSION_ERROR_MARKER}").write_text("err")

    mgr.delete_document(nb.notebook_id, "x.pdf")

    assert not (udir / "x.pdf").exists()
    assert not (udir / f"x{CONVERSION_ERROR_MARKER}").exists()


def test_rename_document_renames_conversion_error_sidecar(tmp_path):
    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("Test NB")
    udir = paths.uploads_dir(nb.notebook_id)
    (udir / "old.pdf").write_text("pdf")
    (udir / f"old{CONVERSION_ERROR_MARKER}").write_text("failed")

    mgr.rename_document(nb.notebook_id, "old.pdf", "new-title")

    assert (udir / "new-title.pdf").exists()
    assert (udir / f"new-title{CONVERSION_ERROR_MARKER}").read_text() == "failed"
    assert not (udir / f"old{CONVERSION_ERROR_MARKER}").exists()


def test_process_upload_items_convert_false_skips_markdown(tmp_path, monkeypatch):
    from deerflow.uploads.pipeline import process_upload_items

    paths = NotebookPaths(base_dir=tmp_path)
    mgr = NotebookManager(paths=paths)
    nb = mgr.create_notebook("NB")
    udir = paths.uploads_dir(nb.notebook_id)

    called: list[str] = []

    async def _should_not_run(_path):
        called.append("convert")
        return None

    monkeypatch.setattr(
        "deerflow.uploads.pipeline.convert_file_to_markdown",
        _should_not_run,
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
            [("x.pdf", b"%PDF-1.4")],
            notebook_id=nb.notebook_id,
            convert=False,
        )
    )
    assert len(out) == 1
    assert called == []
    assert (udir / "x.pdf").exists()
    assert not (udir / "mnd_x.md").exists()
