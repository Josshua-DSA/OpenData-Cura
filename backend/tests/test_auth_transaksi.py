"""Auth & RBAC + transaksi permission tests.

Covers the previously-untested security surface:
  * /auth/me without token -> 401
  * register -> login -> profile (happy path)
  * login with wrong password -> 401
  * RBAC: role without permission -> 403
  * unknown route -> 404
  * transaksi endpoints require auth -> 401
"""
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from backend.app.main import app


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_auth_me_without_token_returns_401(client):
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client):
    # Register a throwaway user first, then attempt wrong password.
    uniq = uuid.uuid4().hex[:8]
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "username": f"u_{uniq}",
            "email": f"u_{uniq}@example.com",
            "password": "correct-horse-battery-staple",
            "full_name": "Test User",
        },
    )
    assert reg.status_code == 201, reg.text

    bad = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": f"u_{uniq}", "password": "wrong-password"},
    )
    assert bad.status_code == 401


@pytest.mark.asyncio
async def test_register_login_me_happy_path(client):
    uniq = uuid.uuid4().hex[:8]
    username = f"h_{uniq}"
    email = f"h_{uniq}@example.com"
    password = "a-strong-password-0123456789"

    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "full_name": "Happy Path",
        },
    )
    assert reg.status_code == 201, reg.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": username, "password": password},
    )
    assert login.status_code == 200, login.text
    token = login.json()["data"]["access_token"]
    assert token

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["data"]["username"] == username


@pytest.mark.asyncio
async def test_rbac_role_without_permission_returns_403(client):
    # A public/analyst user must not create occupancy records (operator/admin only).
    uniq = uuid.uuid4().hex[:8]
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "username": f"rb_{uniq}",
            "email": f"rb_{uniq}@example.com",
            "password": "rbac-password-0123456789",
            "role": "analyst",
        },
    )
    assert reg.status_code == 201, reg.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"username_or_email": f"rb_{uniq}", "password": "rbac-password-0123456789"},
    )
    token = login.json()["data"]["access_token"]

    res = await client.post(
        "/api/v1/transaksi/bor",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "faskes_id": "RS-TEST-001",
            "periode": "2026-08",
            "bor": 78.5,
            "total_tempat_tidur": 100,
        },
    )
    # analyst is not in [operator, admin] -> 403
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_transaksi_requires_auth_returns_401(client):
    res = await client.get("/api/v1/transaksi/bor", params={"faskes_id": "RS-X"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_unknown_route_returns_404(client):
    res = await client.get("/api/v1/does-not-exist")
    assert res.status_code == 404
