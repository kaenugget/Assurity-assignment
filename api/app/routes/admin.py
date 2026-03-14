from __future__ import annotations

from fastapi import APIRouter, Request

from ..schemas import CheckNowResponse, ReloadConfigResponse

router = APIRouter(prefix="/api", tags=["admin"])


@router.post("/reload-config", response_model=ReloadConfigResponse, summary="Reload YAML or JSON service config")
async def reload_config(request: Request) -> ReloadConfigResponse:
    return await request.app.state.monitor.reload_config()


@router.post("/check-now", response_model=CheckNowResponse, summary="Run health checks immediately")
async def check_now(request: Request) -> CheckNowResponse:
    result = await request.app.state.monitor.run_cycle("manual")
    return CheckNowResponse.model_validate(result)
