from __future__ import annotations

import logging

import httpx

from .schemas import AlertEvent

logger = logging.getLogger("assureops.alerts")


async def emit_alert(event: AlertEvent, webhook_url: str | None) -> None:
    payload = event.model_dump(mode="json")
    logger.warning("assureops_alert=%s", payload)

    if not webhook_url:
        return

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(webhook_url, json=payload)
    except Exception as exc:  # pragma: no cover - defensive logging path
        logger.exception("webhook alert failed: %s", exc)
