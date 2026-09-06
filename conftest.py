"""Repo-root pytest bootstrap.

Resolves the two historically-different PYTHONPATH needs in one place so a
bare `pytest` works from a clean checkout:

  * repo root  → `backend.app.*` (and `database.*` package imports)
  * database/  → top-level `models`, `pipeline`, `config`, `etl`, `exceptions`

This replaces the old requirement to remember `PYTHONPATH=database` vs
`PYTHONPATH=.` per suite.
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "database"))
