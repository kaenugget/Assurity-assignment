import { ResponsiveContainer, Tooltip, Treemap } from "recharts";

import type { ServiceSnapshot } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { WidgetFrame } from "@/components/widget-frame";

function platformData(services: ServiceSnapshot[]) {
  const counts = new Map<string, number>();
  for (const service of services) {
    const platform = service.platform || "unassigned";
    counts.set(platform, (counts.get(platform) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, size]) => ({ name, size }));
}

export function PlatformFootprintWidget({
  size,
  services,
}: {
  size: WidgetSize;
  services: ServiceSnapshot[];
}) {
  const data = platformData(services);

  if (size === "small") {
    return (
      <WidgetFrame title="Platform Footprint" subtitle="Runtime mix">
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <span className="capitalize text-slate-600">{item.name}</span>
              <strong>{item.size}</strong>
            </div>
          ))}
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Platform Footprint" subtitle="ECS, EC2, and manually managed coverage">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="#ffffff"
          fill="#88bcd6"
        >
          <Tooltip />
        </Treemap>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}
