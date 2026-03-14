import type { DashboardSummary } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { StatusBadge } from "@/components/status-badge";
import { WidgetFrame } from "@/components/widget-frame";
import { formatLatency } from "@/lib/formatters";

export function AuthJourneyHealthWidget({
  size,
  summary,
}: {
  size: WidgetSize;
  summary: DashboardSummary;
}) {
  const nodes = summary.auth_journey.nodes;

  if (size === "small") {
    return (
      <WidgetFrame title="Auth Journey Health" subtitle="Critical path">
        <div className="flex h-full flex-col justify-between">
          <StatusBadge status={summary.auth_journey.overall_status} />
          <div className="text-sm text-slate-500">
            {summary.auth_journey.bottleneck ? `Bottleneck: ${summary.auth_journey.bottleneck}` : "No bottleneck detected"}
          </div>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Auth Journey Health" subtitle="Authorize → Token → Callback → Profile → App API">
      <div className="grid h-full gap-3 md:grid-cols-5">
        {nodes.map((node) => (
          <div
            key={node.label}
            className="flex flex-col justify-between rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-4"
          >
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{node.label}</div>
              <div className="mt-3 text-sm font-medium text-slate-900">
                {node.service_key || "Unmapped"}
              </div>
            </div>
            <div className="space-y-2">
              <StatusBadge status={node.status} />
              {size === "large" ? (
                <div className="text-sm text-slate-500">
                  {formatLatency(node.latency_ms)} {node.version_drift ? "• drifted" : ""}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
