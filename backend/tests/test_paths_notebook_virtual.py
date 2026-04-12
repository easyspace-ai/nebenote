"""Tests for notebook-aware virtual path resolution."""

from unittest.mock import MagicMock

from deerflow.config.paths import Paths


def test_host_path_under_base_relative_to_host_prefix(tmp_path, monkeypatch):
    monkeypatch.setenv("DEER_FLOW_HOST_BASE_DIR", "/host/proj/.deer-flow")
    paths = Paths(base_dir=tmp_path)
    sub = tmp_path / "notebooks" / "nb_x" / "user-data" / "uploads"
    sub.mkdir(parents=True)
    assert paths.host_path_under_base(sub) == "/host/proj/.deer-flow/notebooks/nb_x/user-data/uploads"


def test_resolve_virtual_path_notebook_thread(tmp_path, monkeypatch):
    paths = Paths(base_dir=tmp_path)
    nb_id = "nb_resolve1"
    uploads = tmp_path / "notebooks" / nb_id / "user-data" / "uploads"
    uploads.mkdir(parents=True)
    (uploads / "report.txt").write_text("hello")

    nb_paths = MagicMock()

    def fake_user_data_dir(nid: str):
        assert nid == nb_id
        return tmp_path / "notebooks" / nb_id / "user-data"

    nb_paths.user_data_dir = fake_user_data_dir

    mock_nb = MagicMock()
    mock_nb.notebook_id = nb_id

    mock_manager = MagicMock()
    mock_manager.paths = nb_paths
    mock_manager.get_notebook_for_thread = lambda tid: mock_nb if tid == "thread-a" else None

    monkeypatch.setattr("deerflow.notebook.get_notebook_manager", lambda: mock_manager)

    resolved = paths.resolve_virtual_path("thread-a", "/mnt/user-data/uploads/report.txt")
    assert resolved == (uploads / "report.txt").resolve()


def test_resolve_virtual_path_plain_thread_unchanged(tmp_path, monkeypatch):
    paths = Paths(base_dir=tmp_path)
    paths.ensure_thread_dirs("thread-plain")
    up = paths.sandbox_uploads_dir("thread-plain")
    (up / "a.txt").write_text("x")

    mock_manager = MagicMock()
    mock_manager.get_notebook_for_thread = lambda _tid: None
    monkeypatch.setattr("deerflow.notebook.get_notebook_manager", lambda: mock_manager)

    resolved = paths.resolve_virtual_path("thread-plain", "/mnt/user-data/uploads/a.txt")
    assert resolved == (up / "a.txt").resolve()
