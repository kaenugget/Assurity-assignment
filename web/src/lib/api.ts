import type {
  IncidentRecord,
  IncidentSummaryResponse,
  LayoutSuggestionResponse,
  ServiceSnapshot,
} from "@/lib/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const apiBaseUrl = API_BASE_URL;

export async function checkNow() {
  return request<{ message: string; checked_services: number }>("/api/check-now", {
    method: "POST",
  });
}

export async function reloadConfig() {
  return request<{ loaded_services: number; source_path: string }>("/api/reload-config", {
    method: "POST",
  });
}

export async function generateIncidentSummary(hours = 24) {
  return request<IncidentSummaryResponse>("/api/ai/incident-summary", {
    method: "POST",
    body: JSON.stringify({ hours }),
  });
}

export async function generateLayoutSuggestion(input: {
  services: ServiceSnapshot[];
  incidents: IncidentRecord[];
  viewportWidth: number;
  columns: number;
  allowedWidgets: string[];
}) {
  return request<LayoutSuggestionResponse>("/api/ai/layout-suggestion", {
    method: "POST",
    body: JSON.stringify({
      services: input.services,
      incidents: input.incidents,
      viewport_width: input.viewportWidth,
      columns: input.columns,
      allowed_widgets: input.allowedWidgets,
    }),
  });
}
