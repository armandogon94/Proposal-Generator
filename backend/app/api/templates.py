import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.template import ProposalTemplate
from app.schemas.template import TemplateCreate, TemplateResponse, TemplateUpdate

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
async def list_templates(
    proposal_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ProposalTemplate).order_by(ProposalTemplate.created_at.desc())
    if proposal_type:
        query = query.where(ProposalTemplate.proposal_type == proposal_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
):
    template = ProposalTemplate(**data.model_dump())
    db.add(template)
    await db.flush()
    return template


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(ProposalTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(ProposalTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    await db.flush()
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    template = await db.get(ProposalTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")
    await db.delete(template)
