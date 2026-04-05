import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_client(client: AsyncClient):
    response = await client.post("/api/clients", json={
        "name": "Jane Doe",
        "email": "jane@example.com",
        "company": "Acme Corp",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Jane Doe"
    assert data["email"] == "jane@example.com"
    assert data["company"] == "Acme Corp"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_client_duplicate_email(client: AsyncClient):
    await client.post("/api/clients", json={
        "name": "Jane Doe",
        "email": "dupe@example.com",
    })
    response = await client.post("/api/clients", json={
        "name": "John Doe",
        "email": "dupe@example.com",
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_clients(client: AsyncClient):
    await client.post("/api/clients", json={"name": "A", "email": "a@test.com"})
    await client.post("/api/clients", json={"name": "B", "email": "b@test.com"})

    response = await client.get("/api/clients")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


@pytest.mark.asyncio
async def test_get_client(client: AsyncClient):
    create_resp = await client.post("/api/clients", json={
        "name": "Get Me",
        "email": "getme@test.com",
    })
    client_id = create_resp.json()["id"]

    response = await client.get(f"/api/clients/{client_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Get Me"


@pytest.mark.asyncio
async def test_update_client(client: AsyncClient):
    create_resp = await client.post("/api/clients", json={
        "name": "Old Name",
        "email": "update@test.com",
    })
    client_id = create_resp.json()["id"]

    response = await client.put(f"/api/clients/{client_id}", json={
        "name": "New Name",
    })
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_archive_client(client: AsyncClient):
    create_resp = await client.post("/api/clients", json={
        "name": "Archive Me",
        "email": "archive@test.com",
    })
    client_id = create_resp.json()["id"]

    response = await client.delete(f"/api/clients/{client_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_nonexistent_client(client: AsyncClient):
    response = await client.get("/api/clients/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_search_clients(client: AsyncClient):
    await client.post("/api/clients", json={"name": "Alice Smith", "email": "alice@search.com"})
    await client.post("/api/clients", json={"name": "Bob Jones", "email": "bob@search.com"})

    response = await client.get("/api/clients?search=Alice")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Alice Smith"
