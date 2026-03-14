from __future__ import annotations

import asyncio
import logging
import time
from datetime import UTC, datetime
from typing import Any

import httpx

from .alerts import emit_alert
from .config_loader import load_services
from .convex_adapter import ConvexAdapter
from .dashboard import default_layouts
from .schemas import (
    AlertEvent,
    HealthCheckRecord,
    HealthStatus,
    IncidentRecord,
    IncidentState,
    IncidentType,
    ReloadConfigResponse,
    ServiceConfig,
    ServiceSnapshot,
)
from .settings import Settings
from .version_parser import extract_version

logger = logging.getLogger("assureops.checker")


def derive_status(
    http_status: int | None,
    latency_ms: float | None,
    latency_threshold_ms: int,
    expected_version: str,
    observed_version: str | None,
    error_message: str | None,
) -> tuple[HealthStatus, bool, bool]:
    if error_message or http_status is None or not 200 <= http_status < 300:
        return HealthStatus.DOWN, False, False

    latency_breach = latency_ms is not None and latency_ms > latency_threshold_ms
    version_drift = observed_version is not None and observed_version != expected_version
    if latency_breach or version_drift:
        return HealthStatus.DEGRADED, version_drift, latency_breach
    return HealthStatus.HEALTHY, False, False


class MonitoringCoordinator:
    def __init__(self, settings: Settings, adapter: ConvexAdapter):
        self.settings = settings
        self.adapter = adapter
        self._run_lock = asyncio.Lock()

    async def bootstrap(self) -> None:
        await self.reload_config()
        await self.adapter.ensure_default_layout({"name": "default", "layouts": default_layouts()})

    async def reload_config(self) -> ReloadConfigResponse:
        services = load_services(
            self.settings.service_config_path,
            {"SELF_BASE_URL": self.settings.effective_self_base_url},
        )
        result = await self.adapter.sync_services([service.model_dump(mode="json") for service in services])
        return ReloadConfigResponse(
            loaded_services=int(result.get("activeCount", len(services))),
            deactivated_services=int(result.get("deactivatedCount", 0)),
            source_path=self.settings.service_config_path,
            completed_at=datetime.now(UTC),
        )

    async def run_cycle(self, reason: str) -> dict[str, Any]:
        if self._run_lock.locked():
            logger.info("Skipping %s cycle because a monitor run is already in progress.", reason)
            return {
                "started": False,
                "checked_services": 0,
                "message": "Health check already running.",
                "completed_at": datetime.now(UTC),
            }

        async with self._run_lock:
            services = [
                ServiceSnapshot.model_validate(service)
                for service in await self.adapter.list_services()
                if service.get("is_active", True)
            ]

            semaphore = asyncio.Semaphore(5)

            async def guarded(service: ServiceSnapshot) -> None:
                async with semaphore:
                    await self._check_one(service)

            await asyncio.gather(*(guarded(service) for service in services))
            return {
                "started": True,
                "checked_services": len(services),
                "message": f"Completed {reason} health check cycle.",
                "completed_at": datetime.now(UTC),
            }

    async def _check_one(self, service: ServiceSnapshot) -> None:
        started_at = datetime.now(UTC)
        observed_version: str | None = None
        latency_ms: float | None = None
        error_message: str | None = None
        http_status: int | None = None

        timeout = httpx.Timeout(service.timeout_ms / 1000)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                started = time.perf_counter()
                response = await client.get(service.url)
                latency_ms = round((time.perf_counter() - started) * 1000, 2)
                http_status = response.status_code
                observed_version = extract_version(
                    response,
                    service.version_source_type,
                    service.version_source_key,
                )
                if not 200 <= response.status_code < 300:
                    error_message = f"Non-2xx response: {response.status_code}"
        except httpx.TimeoutException:
            error_message = "Request timed out."
        except httpx.ConnectError:
            error_message = "Connection or DNS failure."
        except httpx.HTTPError as exc:
            error_message = str(exc)

        status, version_drift, latency_breach = derive_status(
            http_status=http_status,
            latency_ms=latency_ms,
            latency_threshold_ms=service.latency_threshold_ms,
            expected_version=service.expected_version,
            observed_version=observed_version,
            error_message=error_message,
        )

        consecutive_failures = service.consecutive_failures + 1 if status == HealthStatus.DOWN else 0
        service_payload = {
            "serviceKey": service.service_key,
            "checkedAt": started_at.isoformat(),
            "httpStatus": http_status,
            "latencyMs": latency_ms,
            "observedVersion": observed_version,
            "versionDrift": version_drift,
            "derivedStatus": status.value,
            "errorMessage": error_message,
            "consecutiveFailures": consecutive_failures,
        }
        await self.adapter.record_check(service_payload)

        incidents = [
            IncidentRecord.model_validate(item)
            for item in await self.adapter.list_service_incidents(service.service_key)
        ]
        open_incidents = {incident.incident_type: incident for incident in incidents if incident.state == IncidentState.OPEN}

        desired = {
            IncidentType.REPEATED_FAILURE: status == HealthStatus.DOWN and consecutive_failures >= 3,
            IncidentType.LATENCY_DEGRADATION: status == HealthStatus.DEGRADED and latency_breach,
            IncidentType.VERSION_DRIFT: status == HealthStatus.DEGRADED and version_drift,
        }

        for incident_type, should_open in desired.items():
            existing = open_incidents.get(incident_type)
            if should_open:
                message = _incident_message(service.name, incident_type, status, latency_ms, observed_version, service.expected_version)
                action = "opened" if existing is None else "updated"
                result = await self.adapter.apply_incident_transition(
                    {
                        "serviceKey": service.service_key,
                        "incidentType": incident_type.value,
                        "state": IncidentState.OPEN.value,
                        "message": message,
                        "eventAt": started_at.isoformat(),
                    }
                )
                await emit_alert(
                    AlertEvent(
                        service_key=service.service_key,
                        incident_type=incident_type,
                        action=action,
                        state=IncidentState.OPEN,
                        message=str(result.get("message", message)),
                        occurred_at=started_at,
                    ),
                    self.settings.webhook_url,
                )
            elif existing is not None:
                result = await self.adapter.apply_incident_transition(
                    {
                        "serviceKey": service.service_key,
                        "incidentType": incident_type.value,
                        "state": IncidentState.RESOLVED.value,
                        "message": f"{service.name} recovered from {incident_type.value.replace('_', ' ')}.",
                        "eventAt": started_at.isoformat(),
                    }
                )
                await emit_alert(
                    AlertEvent(
                        service_key=service.service_key,
                        incident_type=incident_type,
                        action="resolved",
                        state=IncidentState.RESOLVED,
                        message=str(result.get("message")),
                        occurred_at=started_at,
                    ),
                    self.settings.webhook_url,
                )


def _incident_message(
    service_name: str,
    incident_type: IncidentType,
    status: HealthStatus,
    latency_ms: float | None,
    observed_version: str | None,
    expected_version: str,
) -> str:
    if incident_type == IncidentType.REPEATED_FAILURE:
        return f"{service_name} is DOWN after repeated failed checks."
    if incident_type == IncidentType.LATENCY_DEGRADATION:
        return f"{service_name} is degraded by latency at {latency_ms or 0:.0f}ms."
    return (
        f"{service_name} is serving version {observed_version or 'unknown'} "
        f"while {expected_version} is expected."
    )
