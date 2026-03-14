export type HealthStatus = "HEALTHY" | "DEGRADED" | "DOWN";

export type ServiceSnapshot = {
  service_key: string;
  name: string;
  url: string;
  expected_version: string;
  environment?: string | null;
  platform?: string | null;
  component_type?: string | null;
  timeout_ms: number;
  latency_threshold_ms: number;
  version_source_type: string;
  version_source_key?: string | null;
  aws_region?: string | null;
  aws_cluster?: string | null;
  aws_service_name?: string | null;
  deployment_label?: string | null;
  is_active: boolean;
  current_status?: HealthStatus | null;
  current_latency_ms?: number | null;
  current_version?: string | null;
  version_drift: boolean;
  consecutive_failures: number;
  last_checked_at?: string | null;
  last_error?: string | null;
  http_status?: number | null;
  updated_at?: string | null;
};

export type IncidentRecord = {
  id?: string | null;
  service_key: string;
  incident_type: "repeated_failure" | "latency_degradation" | "version_drift";
  state: "open" | "resolved";
  started_at: string;
  resolved_at?: string | null;
  occurrence_count: number;
  latest_message: string;
  updated_at: string;
};

export type SummaryBucket = {
  label: string;
  total: number;
  healthy: number;
  degraded: number;
  down: number;
};

export type AuthJourneyNode = {
  label: string;
  service_key?: string | null;
  status?: HealthStatus | null;
  latency_ms?: number | null;
  version_drift: boolean;
};

export type DashboardSummary = {
  total_services: number;
  healthy: number;
  degraded: number;
  down: number;
  version_drift_count: number;
  avg_latency_ms: number;
  open_incidents: number;
  by_environment: SummaryBucket[];
  by_platform: SummaryBucket[];
  auth_journey: {
    overall_status: HealthStatus;
    bottleneck?: string | null;
    nodes: AuthJourneyNode[];
  };
  last_poll_at?: string | null;
};

export type FleetTrend = {
  serviceKey: string;
  checkedAt: string;
  latencyMs?: number | null;
  derivedStatus: HealthStatus;
};

export type LayoutsResponse = {
  name: string;
  layouts: Record<string, Array<{ i: string; x: number; y: number; w: number; h: number }>>;
};

export type LayoutSuggestionItem = {
  widgetType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rationale?: string | null;
};

export type LayoutSuggestionResponse = {
  source: string;
  generated_at: string;
  layout: LayoutSuggestionItem[];
};

export type IncidentSummaryResponse = {
  summary: string;
  source: string;
  incident_count: number;
  generated_at: string;
};
