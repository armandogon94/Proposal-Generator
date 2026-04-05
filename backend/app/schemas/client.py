import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class ClientBase(BaseModel):
    name: str
    email: EmailStr
    company: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str = "USA"
    website: str | None = None
    industry: str | None = None
    contact_person: str | None = None
    notes: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    company: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    website: str | None = None
    industry: str | None = None
    contact_person: str | None = None
    notes: str | None = None


class ClientResponse(ClientBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    proposal_count: int = 0

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    company: str | None
    phone: str | None
    proposal_count: int = 0
    last_proposal_date: datetime | None = None

    model_config = {"from_attributes": True}
