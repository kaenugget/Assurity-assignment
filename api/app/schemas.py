from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Platform(str, Enum):
    ECS = "ecs"
    EC2 = "ec2"
    MANUAL = "manual"


class ComponentType(str, Enum):
    AUTHORIZE = "authorize"
    TOKEN = "token"
    CALLBACK = "callback"
    JWKS = "jwks"
    PROFILE = "profile"
    OTP = "otp"
    APP_API = "app_api"
    LEGACY = "legacy"


class VersionSourceType(str, Enum):
    JSON = "json"
    HEADER = "header"
    REGEX = "regex"
    NONE = "none"


class HealthStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    DOWN = "DOWN"


class IncidentType(str, Enum):
    REPEATED_FAILURE = "repeated_failure"
    LATENCY_DEGRADATION = "latency_degradation"
    VERSION_DRIFT = "version_drift"


class IncidentState(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"


class ServiceConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    service_key: str
    name: str
    url: str
    expected_version: str
    environment: str | None = None
    platform: Platform | None = None
    component_type: ComponentType | None = None
    timeout_ms: int = 3000
    latency_threshold_ms: int = 800
    version_source_type: VersionSourceType = VersionSourceType.NONE
    version_source_key: str | None = None
    aws_region: str | None = None
    aws_cluster: str | None = None
    aws_service_name: str | None = None
    deployment_label: str | None = None
    is_active: bool = True


class ServiceSnapshot(ServiceConfig):
    current_status: HealthStatus | None = None
    current_latency_ms: float | None = None
    current_version: str | None = None
    version_drift: bool = False
    consecutive_failures: int = 0
    last_checked_at: datetime | None = None
    last_error: str | None = None
    http_status: int | None = None
    updated_at: datetime | None = None


class HealthCheckRecord(BaseModel):
    service_key: str
    checked_at: datetime
    http_status: int | None = None
    latency_ms: float | None = None
    observed_version: str | None = None
    version_drift: bool = False
    derived_status: HealthStatus
    error_message: str | None = None


class IncidentRecord(BaseModel):
    id: str | None = None
    service_key: str
    incident_type: IncidentType
    state: IncidentState
    started_at: datetime
    resolved_at: datetime | None = None
    occurrence_count: int = 1
    latest_message: str
    updated_at: datetime


class SummaryBucket(BaseModel):
    label: str
    total: int
    healthy: int = 0
    degraded: int = 0
    down: int = 0


class AuthJourneyNode(BaseModel):
    label: str
    service_key: str | None = None
    status: HealthStatus | None = None
    latency_ms: float | None = None
    version_drift: bool = False


class AuthJourneySummary(BaseModel):
    overall_status: HealthStatus
    bottleneck: str | None = None
    nodes: list[AuthJourneyNode]


class DashboardSummary(BaseModel):
    total_services: int
    healthy: int
    degraded: int
    down: int
    version_drift_count: int
    avg_latency_ms: float
    open_incidents: int
    by_environment: list[SummaryBucket]
    by_platform: list[SummaryBucket]
    auth_journey: AuthJourneySummary
    last_poll_at: datetime | None = None


class ReloadConfigResponse(BaseModel):
    loaded_services: int
    deactivated_services: int
    source_path: str
    completed_at: datetime


class CheckNowResponse(BaseModel):
    started: bool
    checked_services: int = 0
    message: str
    completed_at: datetime | None = None


class IncidentSummaryRequest(BaseModel):
    hours: int = Field(default=24, ge=1, le=168)


class IncidentSummaryResponse(BaseModel):
    summary: str
    source: str
    incident_count: int
    generated_at: datetime


class LayoutSuggestionItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    widget_type: str = Field(alias="widgetType", serialization_alias="widgetType")
    x: int
    y: int
    w: int
    h: int
    rationale: str | None = None


class LayoutSuggestionRequest(BaseModel):
    viewport_width: int = Field(default=1440, ge=640, le=2560)
    columns: int = Field(default=12, ge=4, le=24)
    allowed_widgets: list[str]
    services: list[ServiceSnapshot] = Field(default_factory=list)
    incidents: list[IncidentRecord] = Field(default_factory=list)


class LayoutSuggestionResponse(BaseModel):
    source: str
    generated_at: datetime
    layout: list[LayoutSuggestionItem]


class AlertEvent(BaseModel):
    service_key: str
    incident_type: IncidentType
    action: str
    state: IncidentState
    message: str
    occurred_at: datetime


class ServiceHistoryResponse(BaseModel):
    service: ServiceSnapshot
    history: list[HealthCheckRecord]


class ServiceDetailResponse(BaseModel):
    service: ServiceSnapshot
    incidents: list[IncidentRecord]
