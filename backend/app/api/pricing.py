import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.pricing import PricingItem, PricingPackage
from app.models.proposal import Proposal
from app.schemas.proposal import PricingItemCreate, PricingItemResponse

router = APIRouter(tags=["pricing"])


# --- Pricing Packages ---
@router.get("/pricing-packages")
async def list_packages(
    proposal_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(PricingPackage).where(PricingPackage.is_active == True)  # noqa: E712
    if proposal_type:
        query = query.where(
            (PricingPackage.proposal_type == proposal_type)
            | (PricingPackage.proposal_type.is_(None))
        )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/pricing-packages", status_code=201)
async def create_package(
    name: str,
    base_price: Decimal,
    description: str | None = None,
    proposal_type: str | None = None,
    includes: dict | None = None,
    db: AsyncSession = Depends(get_db),
):
    package = PricingPackage(
        name=name,
        base_price=base_price,
        description=description,
        proposal_type=proposal_type,
        includes=includes,
    )
    db.add(package)
    await db.flush()
    return package


# --- Proposal Pricing ---
@router.put(
    "/proposals/{proposal_id}/pricing",
    response_model=list[PricingItemResponse],
)
async def update_proposal_pricing(
    proposal_id: uuid.UUID,
    items: list[PricingItemCreate],
    db: AsyncSession = Depends(get_db),
):
    proposal = await db.get(Proposal, proposal_id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")

    # Delete existing items
    existing = await db.execute(
        select(PricingItem).where(PricingItem.proposal_id == proposal_id)
    )
    for item in existing.scalars().all():
        await db.delete(item)

    # Create new items and calculate total
    total = Decimal("0")
    new_items = []
    for i, item_data in enumerate(items):
        item_total = item_data.quantity * item_data.unit_price
        if item_data.item_type == "discount":
            item_total = -abs(item_total)

        item = PricingItem(
            proposal_id=proposal_id,
            **item_data.model_dump(),
            total_price=item_total,
            order_index=i,
        )
        db.add(item)
        new_items.append(item)

        if item_data.is_selected or not item_data.is_optional:
            total += item_total

    # Update proposal totals
    proposal.total_amount = total
    discount = total * (proposal.discount_percentage / Decimal("100"))
    proposal.final_amount = total - discount

    await db.flush()
    return new_items
