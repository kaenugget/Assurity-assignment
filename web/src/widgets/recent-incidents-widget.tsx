import type { IncidentRecord } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { WidgetFrame } from "@/components/widget-frame";
import { formatDate } from "@/lib/formatters";

export function RecentIncidentsWidget({
  size,
  incidents,
  aiSummary,
  onGenerateSummary,
  summaryLoading,
}: {
  size: WidgetSize;
  incidents: IncidentRecord[];
  aiSummary?: string | null;
  onGenerateSummary: () => void;
  summaryLoading: boolean;
}) {
  const visible = incidents.slice(0, size === "medium" ? 3 : 6);

  if (size === "small") {
    return (
      <WidgetFrame title="Recent Incidents" subtitle="Active and recent">
        <div className="flex h-full flex-col justify-between">
          <div className="text-4xl font-semibold">{incidents.filter((item) => item.state === "open").length}</div>
          <div className="text-sm text-slate-500">Currently open incidents</div>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Recent Incidents" subtitle="Incident stream with optional AI summary">
      <div className="grid h-full gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3 overflow-y-auto">
          {visible.map((incident) => (
            <div key={`${incident.service_key}-${incident.updated_at}`} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{incident.service_key}</div>
                  <div className="mt-1 text-sm text-slate-600">{incident.latest_message}</div>
                </div>
                <StatusBadge status={incident.state === "open" ? "DOWN" : "HEALTHY"} />
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                {incident.incident_type.replace(/_/g, " ")} • {formatDate(incident.updated_at)}
              </div>
            </div>
          ))}
        </div>
        {size === "large" ? (
          <div className="flex h-full flex-col rounded-[1.1rem] border border-[#eee8df] bg-[#fff7ee] px-4 py-4 text-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#9a8d80]">AI incident brief</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">Last 24 hours</div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-slate-700 ring-1 ring-[#e7ddd1] hover:bg-[#fffdfa]"
                onClick={onGenerateSummary}
                disabled={summaryLoading}
              >
                {summaryLoading ? "Refreshing..." : "Summarize"}
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {aiSummary || "No AI summary generated yet. Use Summarize to create an operator-facing brief."}
            </p>
          </div>
        ) : null}
      </div>
    </WidgetFrame>
  );
}
