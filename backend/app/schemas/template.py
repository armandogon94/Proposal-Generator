import uuid
from datetime import datetime

from pydantic import BaseModel


class TemplateBase(BaseModel):
    name: str
    proposal_type: str
    description: str | None = None
    sections: dict | None = None
    default_terms: str | None = None
    default_payment_terms: str | None = "Net 30"
    is_default: bool = False


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: str | None = None
    proposal_type: str | None = None
    description: str | None = None
    sections: dict | None = None
    default_terms: str | None = None
    default_payment_terms: str | None = None
    is_default: bool | None = None


class TemplateResponse(TemplateBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
