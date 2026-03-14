from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Sequence
from typing import Any, Literal, cast

import httpx

from .settings import Settings

logger = logging.getLogger("assureops.convex")


def _omit_none(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _omit_none(item) for key, item in value.items() if item is not None}
    if isinstance(value, list):
        return [_omit_none(item) for item in value]
    return value


class ConvexAdapter:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._client = httpx.AsyncClient(timeout=10.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def _call(
        self,
        function_type: Literal["query", "mutation", "action"],
        path: str,
        args: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self._settings.convex_url.rstrip('/')}/api/{function_type}"
        response = await self._client.post(
            url,
            json={"path": path, "args": _omit_none(args or {}), "format": "json"},
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("status") != "success":
            raise RuntimeError(f"Convex {function_type} failed for {path}: {payload}")
        return payload.get("value")

    async def query(self, path: str, args: dict[str, Any] | None = None) -> Any:
        return await self._call("query", path, args)

    async def mutation(self, path: str, args: dict[str, Any] | None = None) -> Any:
        return await self._call("mutation", path, args)

    async def sync_services(self, services: Sequence[dict[str, Any]]) -> dict[str, Any]:
        result = await self.mutation("services:syncConfig", {"services": list(services)})
        return cast(dict[str, Any], result)

    async def list_services(self) -> list[dict[str, Any]]:
        result = await self.query("services:list")
        return cast(list[dict[str, Any]], result)

    async def get_service(self, service_key: str) -> dict[str, Any] | None:
        result = await self.query("services:getByServiceKey", {"serviceKey": service_key})
        return cast(dict[str, Any] | None, result)

    async def get_summary(self) -> dict[str, Any]:
        result = await self.query("services:summary")
        return cast(dict[str, Any], result)

    async def record_check(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.mutation("checks:recordResult", payload)
        return cast(dict[str, Any], result)

    async def history_by_service(self, service_key: str, limit: int = 20) -> list[dict[str, Any]]:
        result = await self.query("checks:historyByService", {"serviceKey": service_key, "limit": limit})
        return cast(list[dict[str, Any]], result)

    async def recent_fleet_trends(self, limit: int = 40) -> list[dict[str, Any]]:
        result = await self.query("checks:recentFleetTrends", {"limit": limit})
        return cast(list[dict[str, Any]], result)

    async def list_incidents(self, active_only: bool = False) -> list[dict[str, Any]]:
        result = await self.query("incidents:list", {"activeOnly": active_only})
        return cast(list[dict[str, Any]], result)

    async def list_service_incidents(self, service_key: str) -> list[dict[str, Any]]:
        result = await self.query("incidents:listByService", {"serviceKey": service_key})
        return cast(list[dict[str, Any]], result)

    async def apply_incident_transition(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.mutation("incidents:applyTransition", payload)
        return cast(dict[str, Any], result)

    async def save_layout(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.mutation("layouts:saveLayout", payload)
        return cast(dict[str, Any], result)

    async def ensure_default_layout(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.mutation("layouts:ensureDefault", payload)
        return cast(dict[str, Any], result)

    async def save_ai_artifact(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.mutation("aiSuggestions:saveArtifact", payload)
        return cast(dict[str, Any], result)

    async def wait_until_ready(self, timeout_seconds: float = 60.0, interval_seconds: float = 1.0) -> None:
        deadline = time.monotonic() + timeout_seconds
        last_error: Exception | None = None

        while time.monotonic() < deadline:
            try:
                await self.query("services:list")
                logger.info("Convex is reachable at %s", self._settings.convex_url)
                return
            except Exception as exc:  # pragma: no cover - retry path is environment dependent
                last_error = exc
                logger.info("Waiting for Convex at %s", self._settings.convex_url)
                await asyncio.sleep(interval_seconds)

        raise RuntimeError(
            f"Convex at {self._settings.convex_url} was not ready within {timeout_seconds:.0f}s."
        ) from last_error
