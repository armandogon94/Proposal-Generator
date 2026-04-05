import json
import secrets
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.models.client import Client
from app.models.pricing import PricingItem
from app.models.proposal import (
    Proposal,
    ProposalDiagram,
    ProposalSection,
    ProposalStatusHistory,
    ProposalView,
    RefinementConversation,
)
from app.schemas.proposal import (
    GenerateDraftRequest,
    ProposalCreate,
    ProposalListResponse,
    ProposalResponse,
    ProposalSectionUpdate,
    ProposalUpdate,
    RefinementRequest,
    RefinementResponse,
)
from app.services.ai_service import AIService
from app.services.mermaid_service import MermaidService
from app.services.proposal_service import calculate_totals

router = APIRouter(prefix="/proposals", tags=["proposals"])

VALID_STATUSES = {"draft", "sent", "viewed", "accepted", "rejected", "expired"}
VALID_TRANSITIONS = {
    ("draft", "sent"),
    ("draft", "expired"),
    ("sent", "viewed"),
    ("sent", "accepted"),
    ("sent", "rejected"),
    ("sent", "expired"),
    ("viewed", "accepted"),
    ("viewed", "rejected"),
    ("viewed", "expired"),
}


async def _generate_proposal_number(db: AsyncSession) -> str:
    year = datetime.utcnow().year
    result = await db.execute(
        select(Proposal)
        .where(Proposal.proposal_number.like(f"PROP-{year}-%"))
        .order_by(Proposal.proposal_number.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    if last:
        last_num = int(last.proposal_number.split("-")[-1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f"PROP-{year}-{next_num:04d}"


async def _load_proposal(db: AsyncSession, proposal_id: uuid.UUID) -> Proposal:
    result = await db.execute(
        select(Proposal)
        .options(
            selectinload(Proposal.client),
            selectinload(Proposal.sections),
            selectinload(Proposal.pricing_items),
            selectinload(Proposal.diagrams),
            selectinload(Proposal.status_history),
        )
        .where(Proposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    return proposal


def _proposal_to_response(proposal: Proposal) -> ProposalResponse:
    data = ProposalResponse.model_validate(proposal)
    if proposal.client:
        data.client_name = proposal.client.name
        data.client_company = proposal.client.company
    return data


@router.get("", response_model=list[ProposalListResponse])
async def list_proposals(
    status: str | None = None,
    client_id: uuid.UUID | None = None,
    proposal_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Proposal)
        .options(selectinload(Proposal.client))
        .order_by(Proposal.created_at.desc())
    )

    if status:
        query = query.where(Proposal.status == status)
    if client_id:
        query = query.where(Proposal.client_id == client_id)
    if proposal_type:
        query = query.where(Proposal.proposal_type == proposal_type)

    result = await db.execute(query)
    proposals = result.scalars().all()

    return [
        ProposalListResponse(
            id=p.id,
            title=p.title,
            proposal_number=p.proposal_number,
            status=p.status,
            proposal_type=p.proposal_type,
            total_amount=p.total_amount,
            final_amount=p.final_amount,
            client_name=p.client.name if p.client else None,
            client_company=p.client.company if p.client else None,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in proposals
    ]


@router.post("", response_model=ProposalResponse, status_code=201)
async def create_proposal(
    data: ProposalCreate,
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, data.client_id)
    if not client:
        raise HTTPException(404, "Client not found")

    proposal_number = await _generate_proposal_number(db)
    view_token = secrets.token_hex(32)

    # Calculate totals from pricing items
    total = Decimal("0")
    pricing_models = []
    for i, item in enumerate(data.pricing_items):
        item_total = item.quantity * item.unit_price
        total += item_total
        pricing_models.append(
            PricingItem(
                **item.model_dump(),
                total_price=item_total,
                order_index=i,
            )
        )

    discount_amount = total * (Decimal("0") / Decimal("100"))
    final_amount = total - discount_amount

    proposal = Proposal(
        client_id=data.client_id,
        template_id=data.template_id,
        title=data.title,
        proposal_number=proposal_number,
        proposal_type=data.proposal_type,
        project_scope=data.project_scope,
        payment_terms=data.payment_terms,
        validity_days=data.validity_days,
        valid_until=datetime.utcnow().date() + timedelta(days=data.validity_days),
        expires_at=datetime.utcnow() + timedelta(days=data.validity_days),
        total_amount=total,
        final_amount=final_amount,
        ai_model_used=data.ai_model or "haiku",
        view_token=view_token,
        pricing_items=pricing_models,
    )
    db.add(proposal)

    # Record initial status
    db.add(ProposalStatusHistory(
        proposal_id=proposal.id,
        old_status=None,
        new_status="draft",
    ))

    await db.flush()
    return _proposal_to_response(
        await _load_proposal(db, proposal.id)
    )


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    return _proposal_to_response(proposal)


@router.put("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: uuid.UUID,
    data: ProposalUpdate,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    update_data = data.model_dump(exclude_unset=True)

    # Handle status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        old_status = proposal.status
        if new_status != old_status:
            if (old_status, new_status) not in VALID_TRANSITIONS:
                raise HTTPException(
                    400,
                    f"Invalid status transition: {old_status} → {new_status}",
                )
            db.add(ProposalStatusHistory(
                proposal_id=proposal.id,
                old_status=old_status,
                new_status=new_status,
            ))
            # Auto-set timestamps
            if new_status == "sent":
                proposal.sent_at = datetime.utcnow()
            elif new_status == "accepted":
                proposal.accepted_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(proposal, field, value)

    # Recalculate final amount if discount changed
    if "discount_percentage" in update_data:
        discount = proposal.total_amount * (
            proposal.discount_percentage / Decimal("100")
        )
        proposal.final_amount = proposal.total_amount - discount

    await db.flush()
    return _proposal_to_response(
        await _load_proposal(db, proposal.id)
    )


@router.delete("/{proposal_id}", status_code=204)
async def delete_proposal(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    await db.delete(proposal)


@router.post("/{proposal_id}/generate-draft")
async def generate_draft(
    proposal_id: uuid.UUID,
    data: GenerateDraftRequest,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    if proposal.status != "draft":
        raise HTTPException(400, "Can only generate drafts for proposals in draft status")

    ai_service = AIService()

    async def stream_generator():
        full_response = ""
        async for chunk in ai_service.generate_proposal_stream(
            proposal=proposal,
            model=data.model,
            project_scope=data.project_scope or proposal.project_scope,
            services=data.services,
            duration_weeks=data.duration_weeks,
        ):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"

        # Parse sections from the response and save to DB
        sections = ai_service.parse_proposal_sections(full_response)
        for i, section in enumerate(sections):
            db.add(ProposalSection(
                proposal_id=proposal.id,
                section_type=section["type"],
                title=section["title"],
                content=section["content"],
                order_index=i,
            ))

        proposal.ai_model_used = data.model or "haiku"
        proposal.executive_summary = sections[0]["content"] if sections else None
        await db.commit()

        yield f"data: {json.dumps({'type': 'done', 'sections': len(sections)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/{proposal_id}/sections/{section_type}")
async def update_section(
    proposal_id: uuid.UUID,
    section_type: str,
    data: ProposalSectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProposalSection)
        .where(
            ProposalSection.proposal_id == proposal_id,
            ProposalSection.section_type == section_type,
        )
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(404, "Section not found")

    section.content = data.content
    section.is_ai_generated = False
    await db.flush()
    return {"status": "updated"}


@router.post("/{proposal_id}/refine", response_model=RefinementResponse)
async def refine_proposal(
    proposal_id: uuid.UUID,
    data: RefinementRequest,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    ai_service = AIService()

    result = await ai_service.refine_section(
        proposal=proposal,
        user_message=data.message,
        section_type=data.section_type,
        model=data.model,
    )

    # Update section in DB
    if result["section_modified"]:
        section_result = await db.execute(
            select(ProposalSection)
            .where(
                ProposalSection.proposal_id == proposal_id,
                ProposalSection.section_type == result["section_modified"],
            )
        )
        section = section_result.scalar_one_or_none()
        if section:
            section.content = result["refined_content"]

    # Save conversation
    db.add(RefinementConversation(
        proposal_id=proposal_id,
        user_message=data.message,
        ai_response=result["refined_content"],
        section_modified=result["section_modified"],
    ))

    proposal.refinement_count += 1
    proposal.last_ai_refinement_at = datetime.utcnow()
    await db.flush()

    return RefinementResponse(**result)


@router.post("/{proposal_id}/export-pdf")
async def export_pdf(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    from app.services.pdf_service import PDFService
    pdf_service = PDFService()
    filepath = await pdf_service.generate(proposal)
    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"{proposal.proposal_number}.pdf",
    )


@router.post("/{proposal_id}/export-docx")
async def export_docx(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    from app.services.docx_service import DOCXService
    docx_service = DOCXService()
    filepath = await docx_service.generate(proposal)
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{proposal.proposal_number}.docx",
    )


@router.post("/{proposal_id}/diagrams")
async def generate_diagrams(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    proposal = await _load_proposal(db, proposal_id)
    mermaid_service = MermaidService()

    diagrams = await mermaid_service.generate_diagrams(proposal)
    for diagram_data in diagrams:
        db.add(ProposalDiagram(
            proposal_id=proposal_id,
            **diagram_data,
        ))
    await db.flush()
    return {"generated": len(diagrams)}


@router.post("/{proposal_id}/send")
async def send_proposal(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    if proposal.status != "draft":
        raise HTTPException(400, "Only draft proposals can be sent")

    proposal.status = "sent"
    proposal.sent_at = datetime.utcnow()
    db.add(ProposalStatusHistory(
        proposal_id=proposal.id,
        old_status="draft",
        new_status="sent",
    ))
    await db.flush()
    return {"status": "sent", "view_token": proposal.view_token}


@router.get("/{proposal_id}/conversations", response_model=list)
async def list_conversations(
    proposal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RefinementConversation)
        .where(RefinementConversation.proposal_id == proposal_id)
        .order_by(RefinementConversation.created_at)
    )
    return result.scalars().all()


# Public proposal view endpoint (no auth needed)
@router.get("/view/{view_token}")
async def view_proposal_public(
    view_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Proposal)
        .options(
            selectinload(Proposal.client),
            selectinload(Proposal.sections),
            selectinload(Proposal.pricing_items),
            selectinload(Proposal.diagrams),
        )
        .where(Proposal.view_token == view_token)
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    # Log view
    db.add(ProposalView(
        proposal_id=proposal.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))

    # Transition sent → viewed
    if proposal.status == "sent":
        proposal.status = "viewed"
        proposal.viewed_at = datetime.utcnow()
        db.add(ProposalStatusHistory(
            proposal_id=proposal.id,
            old_status="sent",
            new_status="viewed",
        ))

    await db.flush()
    return _proposal_to_response(proposal)
