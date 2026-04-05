from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.models.proposal import Proposal
from app.schemas.proposal import DashboardStats, RecentProposal

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.count(Proposal.id).label("total"),
            func.count(case((Proposal.status == "draft", 1))).label("drafts"),
            func.count(case((Proposal.status == "sent", 1))).label("sent"),
            func.count(case((Proposal.status == "accepted", 1))).label("accepted"),
            func.coalesce(
                func.sum(
                    case(
                        (Proposal.status.in_(["draft", "sent", "viewed"]),
                         Proposal.final_amount),
                        else_=Decimal("0"),
                    )
                ),
                Decimal("0"),
            ).label("pipeline_value"),
            func.coalesce(func.avg(Proposal.final_amount), Decimal("0")).label("avg_value"),
        )
    )
    row = result.one()

    total = row.total or 0
    accepted = row.accepted or 0
    acceptance_rate = (accepted / total * 100) if total > 0 else 0.0

    return DashboardStats(
        total_proposals=total,
        draft_count=row.drafts or 0,
        sent_count=row.sent or 0,
        accepted_count=accepted,
        total_pipeline_value=row.pipeline_value,
        avg_proposal_value=row.avg_value,
        acceptance_rate=round(acceptance_rate, 1),
    )


@router.get("/recent-proposals", response_model=list[RecentProposal])
async def get_recent_proposals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Proposal)
        .options(selectinload(Proposal.client))
        .order_by(Proposal.updated_at.desc())
        .limit(5)
    )
    proposals = result.scalars().all()

    return [
        RecentProposal(
            id=p.id,
            title=p.title,
            proposal_number=p.proposal_number,
            status=p.status,
            client_name=p.client.name if p.client else None,
            final_amount=p.final_amount,
            updated_at=p.updated_at,
        )
        for p in proposals
    ]


@router.get("/clients-pipeline")
async def get_pipeline(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Proposal.status,
            func.count(Proposal.id).label("count"),
            func.coalesce(func.sum(Proposal.final_amount), Decimal("0")).label("value"),
        )
        .group_by(Proposal.status)
    )
    return [
        {"status": row.status, "count": row.count, "value": float(row.value)}
        for row in result.all()
    ]
