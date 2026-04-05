import pytest
from httpx import AsyncClient


@pytest.fixture
async def sample_client(client: AsyncClient) -> dict:
    response = await client.post("/api/clients", json={
        "name": "Test Client",
        "email": "test@proposals.com",
        "company": "Test Corp",
    })
    return response.json()


@pytest.mark.asyncio
async def test_create_proposal(client: AsyncClient, sample_client: dict):
    response = await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Website Redesign",
        "proposal_type": "web_development",
        "project_scope": "Full website redesign with modern tech stack",
        "payment_terms": "Net 30",
        "pricing_items": [
            {"item_type": "package", "name": "Design Phase", "quantity": 1, "unit_price": 5000},
            {"item_type": "hourly", "name": "Development", "quantity": 80, "unit_price": 150},
        ],
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Website Redesign"
    assert data["status"] == "draft"
    assert data["proposal_number"].startswith("PROP-")
    assert len(data["view_token"]) == 64
    assert data["total_amount"] == 17000  # 5000 + 12000
    assert len(data["pricing_items"]) == 2


@pytest.mark.asyncio
async def test_list_proposals(client: AsyncClient, sample_client: dict):
    await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Proposal A",
        "proposal_type": "web_development",
    })

    response = await client.get("/api/proposals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_proposal(client: AsyncClient, sample_client: dict):
    create_resp = await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Get Me",
        "proposal_type": "ai_ml_consulting",
    })
    proposal_id = create_resp.json()["id"]

    response = await client.get(f"/api/proposals/{proposal_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Get Me"


@pytest.mark.asyncio
async def test_update_proposal_status(client: AsyncClient, sample_client: dict):
    create_resp = await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Status Test",
        "proposal_type": "web_development",
    })
    proposal_id = create_resp.json()["id"]

    # Draft → Sent
    response = await client.put(f"/api/proposals/{proposal_id}", json={"status": "sent"})
    assert response.status_code == 200
    assert response.json()["status"] == "sent"
    assert response.json()["sent_at"] is not None


@pytest.mark.asyncio
async def test_invalid_status_transition(client: AsyncClient, sample_client: dict):
    create_resp = await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Invalid Transition",
        "proposal_type": "web_development",
    })
    proposal_id = create_resp.json()["id"]

    # Draft → Accepted (invalid, must go through sent first)
    response = await client.put(f"/api/proposals/{proposal_id}", json={"status": "accepted"})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_send_proposal(client: AsyncClient, sample_client: dict):
    create_resp = await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Send Test",
        "proposal_type": "web_development",
    })
    proposal_id = create_resp.json()["id"]

    response = await client.post(f"/api/proposals/{proposal_id}/send")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sent"
    assert "view_token" in data


@pytest.mark.asyncio
async def test_filter_proposals_by_status(client: AsyncClient, sample_client: dict):
    await client.post("/api/proposals", json={
        "client_id": sample_client["id"],
        "title": "Draft One",
        "proposal_type": "web_development",
    })

    response = await client.get("/api/proposals?status=draft")
    assert response.status_code == 200
    data = response.json()
    assert all(p["status"] == "draft" for p in data)
