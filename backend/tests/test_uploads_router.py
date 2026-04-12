import asyncio
import stat
from io import BytesIO

import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException, UploadFile

from app.gateway.routers import uploads
from app.gateway.routers.auth import User
from deerflow.uploads import pipeline as upload_pipeline


def _test_user() -> User:
    return User(
        id="u1",
        email="u1@test",
        password_hash="x",
        created_at="2020-01-01T00:00:00+00:00",
        updated_at="2020-01-01T00:00:00+00:00",
    )


def _fake_request() -> MagicMock:
    return MagicMock()


def test_upload_files_writes_thread_storage_and_skips_local_sandbox_sync(tmp_path):
    thread_uploads_dir = tmp_path / "uploads"
    thread_uploads_dir.mkdir(parents=True)

    provider = MagicMock()
    provider.acquire.return_value = "local"
    sandbox = MagicMock()
    provider.get.return_value = sandbox

    with (
        patch.object(uploads, "require_thread_access", new_callable=AsyncMock),
        patch.object(
            uploads,
            "_get_upload_dir_for_thread",
            return_value=(thread_uploads_dir, thread_uploads_dir, None),
        ),
        patch.object(upload_pipeline, "get_sandbox_provider", return_value=provider),
    ):
        file = UploadFile(filename="notes.txt", file=BytesIO(b"hello uploads"))
        result = asyncio.run(uploads.upload_files("thread-local", _fake_request(), [file], _test_user()))

    assert result.success is True
    assert len(result.files) == 1
    assert result.files[0]["filename"] == "notes.txt"
    assert (thread_uploads_dir / "notes.txt").read_bytes() == b"hello uploads"

    sandbox.update_file.assert_not_called()


def test_upload_files_syncs_non_local_sandbox_and_marks_markdown_file(tmp_path):
    thread_uploads_dir = tmp_path / "uploads"
    thread_uploads_dir.mkdir(parents=True)

    provider = MagicMock()
    provider.acquire.return_value = "aio-1"
    sandbox = MagicMock()
    provider.get.return_value = sandbox

    async def fake_convert(file_path: Path) -> Path:
        md_path = file_path.with_suffix(".md")
        md_path.write_text("converted", encoding="utf-8")
        return md_path

    with (
        patch.object(uploads, "require_thread_access", new_callable=AsyncMock),
        patch.object(
            uploads,
            "_get_upload_dir_for_thread",
            return_value=(thread_uploads_dir, thread_uploads_dir, None),
        ),
        patch.object(upload_pipeline, "get_sandbox_provider", return_value=provider),
        patch.object(upload_pipeline, "convert_file_to_markdown", AsyncMock(side_effect=fake_convert)),
    ):
        file = UploadFile(filename="report.pdf", file=BytesIO(b"pdf-bytes"))
        result = asyncio.run(uploads.upload_files("thread-aio", _fake_request(), [file], _test_user()))

    assert result.success is True
    assert len(result.files) == 1
    file_info = result.files[0]
    assert file_info["filename"] == "report.pdf"
    assert file_info["markdown_file"] == "report.md"

    assert (thread_uploads_dir / "report.pdf").read_bytes() == b"pdf-bytes"
    assert (thread_uploads_dir / "report.md").read_text(encoding="utf-8") == "converted"

    sandbox.update_file.assert_any_call("/mnt/user-data/uploads/report.pdf", b"pdf-bytes")
    sandbox.update_file.assert_any_call("/mnt/user-data/uploads/report.md", b"converted")


def test_upload_files_makes_non_local_files_sandbox_writable(tmp_path):
    thread_uploads_dir = tmp_path / "uploads"
    thread_uploads_dir.mkdir(parents=True)

    provider = MagicMock()
    provider.acquire.return_value = "aio-1"
    sandbox = MagicMock()
    provider.get.return_value = sandbox

    async def fake_convert(file_path: Path) -> Path:
        md_path = file_path.with_suffix(".md")
        md_path.write_text("converted", encoding="utf-8")
        return md_path

    with (
        patch.object(uploads, "require_thread_access", new_callable=AsyncMock),
        patch.object(
            uploads,
            "_get_upload_dir_for_thread",
            return_value=(thread_uploads_dir, thread_uploads_dir, None),
        ),
        patch.object(upload_pipeline, "get_sandbox_provider", return_value=provider),
        patch.object(upload_pipeline, "convert_file_to_markdown", AsyncMock(side_effect=fake_convert)),
        patch.object(upload_pipeline, "_make_file_sandbox_writable") as make_writable,
    ):
        file = UploadFile(filename="report.pdf", file=BytesIO(b"pdf-bytes"))
        result = asyncio.run(uploads.upload_files("thread-aio", _fake_request(), [file], _test_user()))

    assert result.success is True
    make_writable.assert_any_call(thread_uploads_dir / "report.pdf")
    make_writable.assert_any_call(thread_uploads_dir / "report.md")


def test_upload_files_does_not_adjust_permissions_for_local_sandbox(tmp_path):
    thread_uploads_dir = tmp_path / "uploads"
    thread_uploads_dir.mkdir(parents=True)

    provider = MagicMock()
    provider.acquire.return_value = "local"
    sandbox = MagicMock()
    provider.get.return_value = sandbox

    with (
        patch.object(uploads, "require_thread_access", new_callable=AsyncMock),
        patch.object(
            uploads,
            "_get_upload_dir_for_thread",
            return_value=(thread_uploads_dir, thread_uploads_dir, None),
        ),
        patch.object(upload_pipeline, "get_sandbox_provider", return_value=provider),
        patch.object(upload_pipeline, "_make_file_sandbox_writable") as make_writable,
    ):
        file = UploadFile(filename="notes.txt", file=BytesIO(b"hello uploads"))
        result = asyncio.run(uploads.upload_files("thread-local", _fake_request(), [file], _test_user()))

    assert result.success is True
    make_writable.assert_not_called()


def test_make_file_sandbox_writable_adds_write_bits_for_regular_files(tmp_path):
    file_path = tmp_path / "report.pdf"
    file_path.write_bytes(b"pdf-bytes")
    os_chmod_mode = stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH
    file_path.chmod(os_chmod_mode)

    upload_pipeline._make_file_sandbox_writable(file_path)

    updated_mode = stat.S_IMODE(file_path.stat().st_mode)
    assert updated_mode & stat.S_IWUSR
    assert updated_mode & stat.S_IWGRP
    assert updated_mode & stat.S_IWOTH


def test_make_file_sandbox_writable_skips_symlinks(tmp_path):
    file_path = tmp_path / "target-link.txt"
    file_path.write_text("hello", encoding="utf-8")
    symlink_stat = MagicMock(st_mode=stat.S_IFLNK)

    with (
        patch.object(upload_pipeline.os, "lstat", return_value=symlink_stat),
        patch.object(upload_pipeline.os, "chmod") as chmod,
    ):
        upload_pipeline._make_file_sandbox_writable(file_path)

    chmod.assert_not_called()


def test_upload_files_rejects_dotdot_and_dot_filenames(tmp_path):
    thread_uploads_dir = tmp_path / "uploads"
    thread_uploads_dir.mkdir(parents=True)

    provider = MagicMock()
    provider.acquire.return_value = "local"
    sandbox = MagicMock()
    provider.get.return_value = sandbox

    with (
        patch.object(uploads, "require_thread_access", new_callable=AsyncMock),
        patch.object(
            uploads,
            "_get_upload_dir_for_thread",
            return_value=(thread_uploads_dir, thread_uploads_dir, None),
        ),
        patch.object(upload_pipeline, "get_sandbox_provider", return_value=provider),
    ):
        # These filenames must be rejected outright (no valid items after filtering)
        for bad_name in ["..", "."]:
            file = UploadFile(filename=bad_name, file=BytesIO(b"data"))
            with pytest.raises(HTTPException) as excinfo:
                asyncio.run(uploads.upload_files("thread-local", _fake_request(), [file], _test_user()))
            assert excinfo.value.status_code == 400

        # Path-traversal prefixes are stripped to the basename and accepted safely
        file = UploadFile(filename="../etc/passwd", file=BytesIO(b"data"))
        result = asyncio.run(uploads.upload_files("thread-local", _fake_request(), [file], _test_user()))
        assert result.success is True
        assert len(result.files) == 1
        assert result.files[0]["filename"] == "passwd"

    # Only the safely normalised file should exist
    assert [f.name for f in thread_uploads_dir.iterdir()] == ["passwd"]


def test_delete_uploaded_file_removes_generated_markdown_companion(tmp_path):
    thread_uploads_dir = tmp_path / "uploads"
    thread_uploads_dir.mkdir(parents=True)
    (thread_uploads_dir / "report.pdf").write_bytes(b"pdf-bytes")
    (thread_uploads_dir / "report.md").write_text("converted", encoding="utf-8")

    with (
        patch.object(uploads, "require_thread_access", new_callable=AsyncMock),
        patch.object(
            uploads,
            "_get_upload_dir_for_thread",
            return_value=(thread_uploads_dir, thread_uploads_dir, None),
        ),
    ):
        result = asyncio.run(uploads.delete_uploaded_file("thread-aio", "report.pdf", _fake_request(), _test_user()))

    assert result == {"success": True, "message": "Deleted report.pdf"}
    assert not (thread_uploads_dir / "report.pdf").exists()
    assert not (thread_uploads_dir / "report.md").exists()
