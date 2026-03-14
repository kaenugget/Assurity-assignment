import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { FleetTrend, ServiceSnapshot } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { formatLatency } from "@/lib/formatters";
import { WidgetFrame } from "@/components/widget-frame";

function buildData(trends: FleetTrend[], services: ServiceSnapshot[]) {
  const allowed = new Set(services.map((service) => service.service_key));
  return trends
    .filter((trend) => allowed.has(trend.serviceKey))
    .slice()
    .reverse()
    .map((trend) => ({
      time: new Date(trend.checkedAt).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" }),
      latency: trend.latencyMs ?? 0,
      status: trend.derivedStatus,
      service: trend.serviceKey,
    }));
}

export function LatencyTrendsWidget({
  size,
  services,
  trends,
}: {
  size: WidgetSize;
  services: ServiceSnapshot[];
  trends: FleetTrend[];
}) {
  const data = buildData(trends, services);
  const avg =
    data.length > 0 ? Math.round(data.reduce((sum, item) => sum + item.latency, 0) / data.length) : 0;

  if (size === "small") {
    return (
      <WidgetFrame title="Latency Trends" subtitle="Recent average">
        <div className="flex h-full flex-col justify-between">
          <div className="text-4xl font-semibold">{formatLatency(avg)}</div>
          <div className="text-sm text-slate-500">{data.length} recent fleet samples</div>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Latency Trends" subtitle="Rolling request latency from the latest fleet checks">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="time" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#1d4ed8"
            strokeWidth={size === "large" ? 2.5 : 2}
            dot={size === "large"}
          />
        </LineChart>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}
