import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# --- Pricing Items ---
class PricingItemBase(BaseModel):
    item_type: str = Field(description="package, hourly, fixed, addon, or discount")
    name: str
    description: str | None = None
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    category: str | None = None
    is_optional: bool = False
    is_selected: bool = True


class PricingItemCreate(PricingItemBase):
    pass


class PricingItemResponse(PricingItemBase):
    id: uuid.UUID
    total_price: Decimal
    order_index: int

    model_config = {"from_attributes": True}


# --- Sections ---
class ProposalSectionResponse(BaseModel):
    id: uuid.UUID
    section_type: str
    title: str
    content: str
    order_index: int
    is_ai_generated: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProposalSectionUpdate(BaseModel):
    content: str


# --- Diagrams ---
class DiagramResponse(BaseModel):
    id: uuid.UUID
    diagram_type: str
    mermaid_syntax: str
    svg_output: str | None
    title: str | None

    model_config = {"from_attributes": True}


# --- Status History ---
class StatusHistoryResponse(BaseModel):
    id: uuid.UUID
    old_status: str | None
    new_status: str
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Refinement ---
class RefinementRequest(BaseModel):
    message: str
    section_type: str | None = None
    model: str | None = None


class RefinementResponse(BaseModel):
    refined_content: str
    section_modified: str
    affected_sections: list[str] = []
    coherence_warning: str | None = None


class ConversationResponse(BaseModel):
    id: uuid.UUID
    user_message: str
    ai_response: str
    section_modified: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Proposal ---
class ProposalCreate(BaseModel):
    client_id: uuid.UUID
    title: str
    proposal_type: str
    template_id: uuid.UUID | None = None
    project_scope: str | None = None
    payment_terms: str | None = "Net 30"
    validity_days: int = 30
    ai_model: str | None = None
    pricing_items: list[PricingItemCreate] = []


class ProposalUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    payment_terms: str | None = None
    validity_days: int | None = None
    valid_until: date | None = None
    discount_percentage: Decimal | None = None
    discount_reason: str | None = None


class ProposalResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    template_id: uuid.UUID | None
    title: str
    proposal_number: str
    status: str
    proposal_type: str
    executive_summary: str | None
    project_scope: str | None
    total_amount: Decimal
    currency: str
    discount_percentage: Decimal
    final_amount: Decimal
    payment_terms: str | None
    validity_days: int
    valid_until: date | None
    ai_model_used: str
    refinement_count: int
    view_token: str
    created_at: datetime
    updated_at: datetime
    sent_at: datetime | None
    viewed_at: datetime | None
    accepted_at: datetime | None

    # Nested
    client_name: str | None = None
    client_company: str | None = None
    sections: list[ProposalSectionResponse] = []
    pricing_items: list[PricingItemResponse] = []
    diagrams: list[DiagramResponse] = []
    status_history: list[StatusHistoryResponse] = []

    model_config = {"from_attributes": True}


class ProposalListResponse(BaseModel):
    id: uuid.UUID
    title: str
    proposal_number: str
    status: str
    proposal_type: str
    total_amount: Decimal
    final_amount: Decimal
    client_name: str | None = None
    client_company: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Generate Draft ---
class GenerateDraftRequest(BaseModel):
    model: str | None = None
    project_scope: str | None = None
    services: list[str] = []
    duration_weeks: int | None = None


# --- Export ---
class ExportResponse(BaseModel):
    filename: str
    content_type: str
    url: str


# --- Dashboard ---
class DashboardStats(BaseModel):
    total_proposals: int
    draft_count: int
    sent_count: int
    accepted_count: int
    total_pipeline_value: Decimal
    avg_proposal_value: Decimal
    acceptance_rate: float


class RecentProposal(BaseModel):
    id: uuid.UUID
    title: str
    proposal_number: str
    status: str
    client_name: str | None
    final_amount: Decimal
    updated_at: datetime

    model_config = {"from_attributes": True}
