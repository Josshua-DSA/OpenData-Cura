"""Pytest configuration for backend tests.

Provides a strong JWT secret for the test environment so that the security
guard in `backend/app/core/config.py` (which refuses to boot with an insecure
default) is satisfied WITHOUT requiring a .env file in CI or a clean machine.

This must run before `backend.app.main` is imported.
"""
import os

# 32+ char secret used ONLY for tests/dev — never for production.
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test_only_jwt_secret_key_0123456789_abcdefghijklmnop",
)
