from __future__ import annotations

from fastapi import APIRouter, Query, Request

from ..schemas import DashboardSummary, IncidentRecord

router = APIRouter(prefix="/api", tags=["summary", "incidents"])


@router.get("/summary", response_model=DashboardSummary, summary="Get dashboard summary")
async def get_summary(request: Request) -> DashboardSummary:
    summary = await request.app.state.adapter.get_summary()
    return DashboardSummary.model_validate(summary)


@router.get("/incidents", response_model=list[IncidentRecord], summary="List incidents")
async def list_incidents(
    request: Request,
    active_only: bool = Query(default=False),
) -> list[IncidentRecord]:
    incidents = await request.app.state.adapter.list_incidents(active_only)
    return [IncidentRecord.model_validate(incident) for incident in incidents]
