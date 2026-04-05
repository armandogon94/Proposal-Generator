import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class Proposal(Base):
    __tablename__ = "proposals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposal_templates.id")
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    proposal_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    proposal_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # Core content
    executive_summary: Mapped[str | None] = mapped_column(Text)
    client_overview: Mapped[str | None] = mapped_column(Text)
    project_scope: Mapped[str | None] = mapped_column(Text)
    deliverables: Mapped[dict | None] = mapped_column(JSONB)
    timeline: Mapped[dict | None] = mapped_column(JSONB)

    # Pricing
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    discount_percentage: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0
    )
    discount_reason: Mapped[str | None] = mapped_column(String(255))
    final_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    payment_terms: Mapped[str | None] = mapped_column(String(100))

    # Metadata
    validity_days: Mapped[int] = mapped_column(Integer, default=30)
    valid_until: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    viewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # AI tracking
    ai_model_used: Mapped[str] = mapped_column(String(50), default="haiku")
    refinement_count: Mapped[int] = mapped_column(Integer, default=0)
    last_ai_refinement_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    # View tracking
    view_token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )

    created_by: Mapped[str] = mapped_column(String(100), default="armando")

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="proposals")  # noqa: F821
    template: Mapped["ProposalTemplate | None"] = relationship()  # noqa: F821
    sections: Mapped[list["ProposalSection"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan",
        order_by="ProposalSection.order_index"
    )
    pricing_items: Mapped[list["PricingItem"]] = relationship(  # noqa: F821
        back_populates="proposal", cascade="all, delete-orphan",
        order_by="PricingItem.order_index"
    )
    status_history: Mapped[list["ProposalStatusHistory"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan",
        order_by="ProposalStatusHistory.created_at"
    )
    diagrams: Mapped[list["ProposalDiagram"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan"
    )
    refinement_conversations: Mapped[list["RefinementConversation"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan",
        order_by="RefinementConversation.created_at"
    )
    views: Mapped[list["ProposalView"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_proposals_client_id", "client_id"),
        Index("idx_proposals_status", "status"),
        Index("idx_proposals_created_at", created_at.desc()),
    )

    def __repr__(self) -> str:
        return f"<Proposal {self.proposal_number}: {self.title}>"


class ProposalSection(Base):
    __tablename__ = "proposal_sections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
    )
    section_type: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    proposal: Mapped["Proposal"] = relationship(back_populates="sections")

    __table_args__ = (
        UniqueConstraint("proposal_id", "section_type"),
        Index("idx_proposal_sections_proposal_id", "proposal_id"),
    )


class ProposalStatusHistory(Base):
    __tablename__ = "proposal_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
    )
    old_status: Mapped[str | None] = mapped_column(String(50))
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    proposal: Mapped["Proposal"] = relationship(back_populates="status_history")


class ProposalDiagram(Base):
    __tablename__ = "proposal_diagrams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
    )
    diagram_type: Mapped[str] = mapped_column(String(100), nullable=False)
    mermaid_syntax: Mapped[str] = mapped_column(Text, nullable=False)
    svg_output: Mapped[str | None] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    proposal: Mapped["Proposal"] = relationship(back_populates="diagrams")


class RefinementConversation(Base):
    __tablename__ = "refinement_conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_message: Mapped[str] = mapped_column(Text, nullable=False)
    ai_response: Mapped[str] = mapped_column(Text, nullable=False)
    section_modified: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    proposal: Mapped["Proposal"] = relationship(
        back_populates="refinement_conversations"
    )


class ProposalView(Base):
    __tablename__ = "proposal_views"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"),
        nullable=False,
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)

    proposal: Mapped["Proposal"] = relationship(back_populates="views")
