import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ServiceSnapshot } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { WidgetFrame } from "@/components/widget-frame";

function environmentData(services: ServiceSnapshot[]) {
  const map = new Map<string, { environment: string; healthy: number; degraded: number; down: number }>();
  for (const service of services) {
    const environment = service.environment || "default";
    const current = map.get(environment) || { environment, healthy: 0, degraded: 0, down: 0 };
    if (service.current_status === "HEALTHY") current.healthy += 1;
    if (service.current_status === "DEGRADED") current.degraded += 1;
    if (service.current_status === "DOWN") current.down += 1;
    map.set(environment, current);
  }
  return Array.from(map.values());
}

export function EnvironmentHealthWidget({
  size,
  services,
}: {
  size: WidgetSize;
  services: ServiceSnapshot[];
}) {
  const data = environmentData(services);

  if (size === "small") {
    return (
      <WidgetFrame title="Environment Health" subtitle="Grouped health">
        <div className="space-y-3">
          {data.slice(0, 2).map((item) => (
            <div key={item.environment} className="flex items-center justify-between text-sm">
              <span className="capitalize text-slate-600">{item.environment}</span>
              <span className="font-semibold text-slate-900">
                {item.down > 0 ? `${item.down} down` : `${item.healthy} healthy`}
              </span>
            </div>
          ))}
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame
      title="Environment Health"
      subtitle={size === "large" ? "Healthy, degraded, and down by environment" : "Environment distribution"}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="environment" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="healthy" stackId="a" fill="#15803d" radius={[6, 6, 0, 0]} />
          <Bar dataKey="degraded" stackId="a" fill="#d97706" />
          <Bar dataKey="down" stackId="a" fill="#dc2626" radius={[0, 0, 6, 6]} />
        </BarChart>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}
