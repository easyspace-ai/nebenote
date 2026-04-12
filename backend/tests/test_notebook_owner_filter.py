"""Notebook list filtering by owner_id."""

from deerflow.notebook.manager import NotebookManager
from deerflow.notebook.paths import NotebookPaths


def test_list_notebooks_filters_by_owner(tmp_path):
    paths = NotebookPaths(tmp_path)
    mgr = NotebookManager(paths=paths)

    a = mgr.create_notebook("A", owner_id="user-1")
    b = mgr.create_notebook("B", owner_id="user-2")

    all_nb = mgr.list_notebooks()
    assert {x.notebook_id for x in all_nb} == {a.notebook_id, b.notebook_id}

    u1 = mgr.list_notebooks(owner_id="user-1")
    assert len(u1) == 1 and u1[0].notebook_id == a.notebook_id

    u2 = mgr.list_notebooks(owner_id="user-2")
    assert len(u2) == 1 and u2[0].notebook_id == b.notebook_id
