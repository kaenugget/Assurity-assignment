from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from ..schemas import ServiceDetailResponse, ServiceHistoryResponse, ServiceSnapshot

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=list[ServiceSnapshot], summary="List monitored services")
async def list_services(request: Request) -> list[ServiceSnapshot]:
    adapter = request.app.state.adapter
    services = await adapter.list_services()
    return [ServiceSnapshot.model_validate(service) for service in services]


@router.get(
    "/{service_key}",
    response_model=ServiceDetailResponse,
    summary="Get one monitored service",
)
async def get_service(service_key: str, request: Request) -> ServiceDetailResponse:
    adapter = request.app.state.adapter
    service = await adapter.get_service(service_key)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found.")
    incidents = await adapter.list_service_incidents(service_key)
    return ServiceDetailResponse(
        service=ServiceSnapshot.model_validate(service),
        incidents=incidents,
    )


@router.get(
    "/{service_key}/history",
    response_model=ServiceHistoryResponse,
    summary="Get recent service history",
)
async def service_history(
    service_key: str,
    request: Request,
    limit: int = Query(default=20, ge=1, le=200),
) -> ServiceHistoryResponse:
    adapter = request.app.state.adapter
    service = await adapter.get_service(service_key)
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found.")
    history = await adapter.history_by_service(service_key, limit)
    return ServiceHistoryResponse(service=ServiceSnapshot.model_validate(service), history=history)
