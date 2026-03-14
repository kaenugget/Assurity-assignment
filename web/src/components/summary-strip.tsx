import type { DashboardSummary } from "@/lib/types";

import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatLatency } from "@/lib/formatters";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export function SummaryStrip({ summary }: { summary: DashboardSummary }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-3 p-4 md:grid-cols-6">
        <Metric label="Total services" value={summary.total_services} />
        <Metric label="Healthy" value={summary.healthy} />
        <Metric label="Degraded" value={summary.degraded} />
        <Metric label="Down" value={summary.down} />
        <Metric label="Avg latency" value={formatLatency(summary.avg_latency_ms)} />
        <div className="rounded-[1.1rem] border border-white/70 bg-slate-900 px-4 py-3 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Auth journey
          </div>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={summary.auth_journey.overall_status} className="bg-white/10 text-white" />
            <span className="text-sm text-slate-200">
              Last poll {formatDate(summary.last_poll_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
