from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Request

from ..ai import (
    filter_incidents_window,
    generate_incident_summary,
    generate_layout_suggestion,
)
from ..dashboard import flatten_layout_suggestion
from ..schemas import (
    IncidentRecord,
    IncidentSummaryRequest,
    IncidentSummaryResponse,
    LayoutSuggestionRequest,
    LayoutSuggestionResponse,
    ServiceSnapshot,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post(
    "/incident-summary",
    response_model=IncidentSummaryResponse,
    summary="Generate an operator-facing summary of recent incidents",
)
async def incident_summary(
    request: Request,
    body: IncidentSummaryRequest,
) -> IncidentSummaryResponse:
    settings = request.app.state.settings
    adapter = request.app.state.adapter
    incidents = [IncidentRecord.model_validate(item) for item in await adapter.list_incidents(False)]
    filtered = filter_incidents_window(incidents, body.hours)
    summary, source = generate_incident_summary(settings, filtered, body.hours)
    response = IncidentSummaryResponse(
        summary=summary,
        source=source,
        incident_count=len(filtered),
        generated_at=datetime.now(UTC),
    )
    await adapter.save_ai_artifact(
        {
            "kind": "incident_summary",
            "source": source,
            "summary": summary,
            "payloadJson": response.model_dump_json(by_alias=True),
            "generatedAt": response.generated_at.isoformat(),
        }
    )
    return response


@router.post(
    "/layout-suggestion",
    response_model=LayoutSuggestionResponse,
    summary="Generate a structured dashboard layout suggestion",
)
async def layout_suggestion(
    request: Request,
    body: LayoutSuggestionRequest,
) -> LayoutSuggestionResponse:
    settings = request.app.state.settings
    services = body.services or [
        ServiceSnapshot.model_validate(item) for item in await request.app.state.adapter.list_services()
    ]
    incidents = body.incidents or [
        IncidentRecord.model_validate(item) for item in await request.app.state.adapter.list_incidents(False)
    ]
    layout, source = generate_layout_suggestion(
        settings=settings,
        allowed_widgets=body.allowed_widgets,
        services=services,
        incidents=incidents,
        viewport_width=body.viewport_width,
        columns=body.columns,
    )
    response = LayoutSuggestionResponse(
        source=source,
        generated_at=datetime.now(UTC),
        layout=layout,
    )
    await request.app.state.adapter.save_ai_artifact(
        {
            "kind": "layout_suggestion",
            "source": source,
            "summary": "Dashboard layout suggestion generated.",
            "payloadJson": response.model_dump_json(by_alias=True),
            "generatedAt": response.generated_at.isoformat(),
        }
    )
    await request.app.state.adapter.save_layout(
        {"name": "ai-preview", "layouts": flatten_layout_suggestion(layout)}
    )
    return response
