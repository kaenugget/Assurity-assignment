from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .checker import MonitoringCoordinator
from .convex_adapter import ConvexAdapter
from .demo_endpoints import router as demo_router
from .routes.admin import router as admin_router
from .routes.ai import router as ai_router
from .routes.services import router as services_router
from .routes.summary import router as summary_router
from .scheduler import build_scheduler
from .settings import Settings, get_settings

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    adapter = ConvexAdapter(settings)
    monitor = MonitoringCoordinator(settings, adapter)
    await adapter.wait_until_ready()
    await monitor.bootstrap()
    scheduler = build_scheduler(monitor, settings.check_interval_seconds)
    scheduler.start()

    app.state.settings = settings
    app.state.adapter = adapter
    app.state.monitor = monitor
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        await adapter.close()


app = FastAPI(
    title="AssureOps API",
    version="0.1.0",
    description=(
        "AssureOps is a fictional internal reliability dashboard for auth-critical "
        "government-style web services. The monitored service stack is entirely fictional "
        "and is not affiliated with Singpass or GovTech."
    ),
    contact={"name": "AssureOps Take-home", "url": "https://example.invalid"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
    openapi_tags=[
        {"name": "services", "description": "Read service inventory and detail."},
        {"name": "summary", "description": "Read fleet-level summary state."},
        {"name": "incidents", "description": "Read recent or active incidents."},
        {"name": "admin", "description": "Trigger config reloads and health checks."},
        {"name": "ai", "description": "Optional AI helpers with deterministic fallbacks."},
        {"name": "demo", "description": "Fictional demo endpoints for local review."},
    ],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["system"], summary="Basic health check")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(services_router)
app.include_router(summary_router)
app.include_router(admin_router)
app.include_router(ai_router)
app.include_router(demo_router)
