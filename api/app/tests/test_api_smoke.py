from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes.summary import router as summary_router


class FakeAdapter:
    async def get_summary(self) -> dict[str, object]:
        return {
            "total_services": 7,
            "healthy": 3,
            "degraded": 2,
            "down": 2,
            "version_drift_count": 1,
            "avg_latency_ms": 412.0,
            "open_incidents": 2,
            "by_environment": [
                {"label": "production", "total": 6, "healthy": 3, "degraded": 1, "down": 2}
            ],
            "by_platform": [
                {"label": "ecs", "total": 4, "healthy": 2, "degraded": 2, "down": 0}
            ],
            "auth_journey": {
                "overall_status": "DOWN",
                "bottleneck": "production-legacy-benefits-api",
                "nodes": [],
            },
            "last_poll_at": "2026-03-14T00:00:00+00:00",
        }


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.adapter = FakeAdapter()
    yield


def test_summary_smoke() -> None:
    app = FastAPI(lifespan=lifespan)
    app.include_router(summary_router)
    with TestClient(app) as client:
        response = client.get("/api/summary")
        assert response.status_code == 200
        payload = response.json()
        assert payload["total_services"] == 7
        assert payload["healthy"] == 3
