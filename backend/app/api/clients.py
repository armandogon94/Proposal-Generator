import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.client import Client
from app.models.proposal import Proposal
from app.schemas.client import (
    ClientCreate,
    ClientListResponse,
    ClientResponse,
    ClientUpdate,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientListResponse])
async def list_clients(
    search: str | None = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(
            Client,
            func.count(Proposal.id).label("proposal_count"),
            func.max(Proposal.created_at).label("last_proposal_date"),
        )
        .outerjoin(Proposal, Proposal.client_id == Client.id)
        .where(Client.is_active == is_active)
        .group_by(Client.id)
        .order_by(Client.created_at.desc())
    )

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            Client.name.ilike(search_filter)
            | Client.email.ilike(search_filter)
            | Client.company.ilike(search_filter)
        )

    result = await db.execute(query)
    rows = result.all()

    return [
        ClientListResponse(
            id=row.Client.id,
            name=row.Client.name,
            email=row.Client.email,
            company=row.Client.company,
            phone=row.Client.phone,
            proposal_count=row.proposal_count,
            last_proposal_date=row.last_proposal_date,
        )
        for row in rows
    ]


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Client).where(Client.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "A client with this email already exists")

    client = Client(**data.model_dump())
    db.add(client)
    await db.flush()
    return ClientResponse.model_validate(client)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Client,
            func.count(Proposal.id).label("proposal_count"),
        )
        .outerjoin(Proposal, Proposal.client_id == Client.id)
        .where(Client.id == client_id)
        .group_by(Client.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Client not found")

    response = ClientResponse.model_validate(row.Client)
    response.proposal_count = row.proposal_count
    return response


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Client not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.flush()
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=204)
async def archive_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, client_id)
    if not client:
        raise HTTPException(404, "Client not found")

    client.is_active = False
    await db.flush()
