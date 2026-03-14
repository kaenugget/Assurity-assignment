from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from openai import OpenAI

from .dashboard import WIDGET_TYPES, default_layouts
from .schemas import IncidentRecord, LayoutSuggestionItem, ServiceSnapshot
from .settings import Settings


def summarize_incidents_fallback(incidents: list[IncidentRecord], hours: int) -> str:
    if not incidents:
        return f"No incidents were recorded in the last {hours} hours. The monitored fleet stayed stable."

    open_incidents = [incident for incident in incidents if incident.state == "open"]
    down_services = [incident.service_key for incident in incidents if incident.incident_type == "repeated_failure"]
    drifted = [incident.service_key for incident in incidents if incident.incident_type == "version_drift"]
    latency = [incident.service_key for incident in incidents if incident.incident_type == "latency_degradation"]

    parts = [
        f"{len(incidents)} incidents were observed in the last {hours} hours.",
        f"{len(open_incidents)} remain open." if open_incidents else "All recorded incidents are currently resolved.",
    ]
    if down_services:
        parts.append(f"Repeated failures affected {', '.join(sorted(set(down_services)))}.")
    if drifted:
        parts.append(f"Version drift was detected on {', '.join(sorted(set(drifted)))}.")
    if latency:
        parts.append(f"Latency pressure was concentrated on {', '.join(sorted(set(latency)))}.")
    return " ".join(parts)


def _schema_for_layout() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "layout": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "widgetType": {
                            "type": "string",
                            "enum": WIDGET_TYPES,
                        },
                        "x": {"type": "integer"},
                        "y": {"type": "integer"},
                        "w": {"type": "integer"},
                        "h": {"type": "integer"},
                        "rationale": {"type": "string"},
                    },
                    "required": ["widgetType", "x", "y", "w", "h", "rationale"],
                },
            }
        },
        "required": ["layout"],
    }


def layout_fallback(allowed_widgets: list[str]) -> list[LayoutSuggestionItem]:
    layout = default_layouts()["lg"]
    filtered = [item for item in layout if item["i"] in set(allowed_widgets)]
    return [
        LayoutSuggestionItem(
            widgetType=str(item["i"]),
            x=int(item["x"]),
            y=int(item["y"]),
            w=int(item["w"]),
            h=int(item["h"]),
            rationale="Deterministic fallback layout prioritizing summary-first scanning.",
        )
        for item in filtered
    ]


def _openai_client(settings: Settings) -> OpenAI | None:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def generate_incident_summary(
    settings: Settings,
    incidents: list[IncidentRecord],
    hours: int,
) -> tuple[str, str]:
    client = _openai_client(settings)
    fallback = summarize_incidents_fallback(incidents, hours)
    if client is None:
        return fallback, "fallback"

    payload = [incident.model_dump(mode="json") for incident in incidents]
    try:
        response = client.responses.create(
            model=settings.openai_model,
            instructions=(
                "You are assisting operators for a fictional internal reliability dashboard. "
                "Write a concise, factual operational summary. Avoid speculation."
            ),
            input=json.dumps(
                {
                    "window_hours": hours,
                    "current_time": datetime.now(UTC).isoformat(),
                    "incidents": payload,
                }
            ),
        )
        summary = (response.output_text or "").strip()
        return (summary or fallback), "openai"
    except Exception:
        return fallback, "fallback"


def generate_layout_suggestion(
    settings: Settings,
    allowed_widgets: list[str],
    services: list[ServiceSnapshot],
    incidents: list[IncidentRecord],
    viewport_width: int,
    columns: int,
) -> tuple[list[LayoutSuggestionItem], str]:
    fallback = layout_fallback(allowed_widgets)
    client = _openai_client(settings)
    if client is None:
        return fallback, "fallback"

    try:
        response = client.responses.create(
            model=settings.openai_model,
            instructions=(
                "Return JSON only. Suggest a dashboard layout for an internal ops tool. "
                "Prioritize summary-first scanning, auth journey visibility, and problematic services."
            ),
            input=json.dumps(
                {
                    "viewportWidth": viewport_width,
                    "columns": columns,
                    "allowedWidgets": allowed_widgets,
                    "services": [service.model_dump(mode="json") for service in services],
                    "incidents": [incident.model_dump(mode="json") for incident in incidents],
                }
            ),
            text={
                "format": {
                    "type": "json_schema",
                    "name": "dashboard_layout",
                    "strict": True,
                    "schema": _schema_for_layout(),
                }
            },
        )
        raw = response.output_text or ""
        parsed = json.loads(raw)
        suggestions = [LayoutSuggestionItem.model_validate(item) for item in parsed["layout"]]
        valid = validate_layout_suggestion(suggestions, allowed_widgets, columns)
        return valid, "openai"
    except Exception:
        return fallback, "fallback"


def validate_layout_suggestion(
    layout: list[LayoutSuggestionItem],
    allowed_widgets: list[str],
    columns: int,
) -> list[LayoutSuggestionItem]:
    allowed = set(allowed_widgets)
    seen: set[str] = set()
    validated: list[LayoutSuggestionItem] = []
    for item in layout:
        if item.widget_type not in allowed or item.widget_type in seen:
            continue
        if item.x < 0 or item.y < 0 or item.w < 2 or item.h < 2:
            continue
        if item.x + item.w > columns:
            continue
        validated.append(item)
        seen.add(item.widget_type)
    if not validated:
        return layout_fallback(allowed_widgets)
    return validated


def filter_incidents_window(incidents: list[IncidentRecord], hours: int) -> list[IncidentRecord]:
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    return [incident for incident in incidents if incident.updated_at >= cutoff]
