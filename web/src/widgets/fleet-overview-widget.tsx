import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { DashboardSummary } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { StatusBadge } from "@/components/status-badge";
import { WidgetFrame } from "@/components/widget-frame";

const COLORS = {
  HEALTHY: "#15803d",
  DEGRADED: "#d97706",
  DOWN: "#dc2626",
};

export function FleetOverviewWidget({
  size,
  summary,
}: {
  size: WidgetSize;
  summary: DashboardSummary;
}) {
  const data = [
    { name: "Healthy", value: summary.healthy, color: COLORS.HEALTHY },
    { name: "Degraded", value: summary.degraded, color: COLORS.DEGRADED },
    { name: "Down", value: summary.down, color: COLORS.DOWN },
  ];

  if (size === "small") {
    return (
      <WidgetFrame title="Fleet Overview" subtitle="Latest reliability posture">
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="text-4xl font-semibold text-slate-900">{summary.total_services}</div>
            <div className="mt-1 text-sm text-slate-500">Monitored services</div>
          </div>
          <div className="flex items-center justify-between">
            <StatusBadge
              status={
                summary.down > 0 ? "DOWN" : summary.degraded > 0 ? "DEGRADED" : "HEALTHY"
              }
            />
            <div className="text-sm text-slate-500">{summary.open_incidents} incidents</div>
          </div>
        </div>
      </WidgetFrame>
    );
  }

  if (size === "medium") {
    return (
      <WidgetFrame title="Fleet Overview" subtitle="Current service distribution">
        <div className="grid h-full grid-cols-[120px_1fr] items-center gap-4">
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={28} outerRadius={46} paddingAngle={4}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}</span>
                </div>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Fleet Overview" subtitle="Summary-first view across the full monitored fleet">
      <div className="grid h-full gap-5 lg:grid-cols-[220px_1fr]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={46} outerRadius={72} paddingAngle={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Open incidents</div>
            <div className="mt-2 text-3xl font-semibold">{summary.open_incidents}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Version drift</div>
            <div className="mt-2 text-3xl font-semibold">{summary.version_drift_count}</div>
          </div>
          {data.map((entry) => (
            <div key={entry.name} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.name}</div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: entry.color }}>
                {entry.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetFrame>
  );
}
