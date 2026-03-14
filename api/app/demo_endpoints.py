from __future__ import annotations

import asyncio
from itertools import count

from fastapi import APIRouter, HTTPException, Response

router = APIRouter(prefix="/demo", tags=["demo"])
_flaky_counter = count()


def _payload(service_state: str, version: str) -> dict[str, object]:
    return {
        "status": "ok",
        "serviceState": service_state,
        "meta": {"version": version},
        "note": f'Simulated payload for {service_state} checks; regex can parse "version":"{version}"',
    }


@router.get("/healthy", summary="Healthy demo endpoint")
async def healthy(response: Response, version: str = "2026.03.14") -> dict[str, object]:
    response.headers["X-Service-Version"] = version
    response.headers["X-Demo-State"] = "healthy"
    return _payload("healthy", version)


@router.get("/slow", summary="Slow demo endpoint")
async def slow(
    response: Response,
    version: str = "2026.03.14",
    delay_ms: int = 1400,
) -> dict[str, object]:
    await asyncio.sleep(delay_ms / 1000)
    response.headers["X-Service-Version"] = version
    response.headers["X-Demo-State"] = "slow"
    return _payload("slow", version)


@router.get("/drift", summary="Version drift demo endpoint")
async def drift(response: Response, version: str = "2026.03.01") -> dict[str, object]:
    response.headers["X-Service-Version"] = version
    response.headers["X-Demo-State"] = "drift"
    return _payload("drift", version)


@router.get("/flaky", summary="Flaky demo endpoint")
async def flaky(response: Response, version: str = "2026.03.14") -> dict[str, object]:
    current = next(_flaky_counter)
    if current % 3 == 0:
        raise HTTPException(status_code=503, detail="Simulated intermittent failure.")
    response.headers["X-Service-Version"] = version
    response.headers["X-Demo-State"] = "flaky"
    return _payload("flaky", version)


@router.get("/down", summary="Down demo endpoint")
async def down() -> dict[str, object]:
    raise HTTPException(status_code=503, detail="Simulated hard outage.")
