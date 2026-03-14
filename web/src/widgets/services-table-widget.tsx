import type { ServiceSnapshot } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { StatusBadge } from "@/components/status-badge";
import { WidgetFrame } from "@/components/widget-frame";
import { formatLatency } from "@/lib/formatters";

export function ServicesTableWidget({
  size,
  services,
  onSelect,
}: {
  size: WidgetSize;
  services: ServiceSnapshot[];
  onSelect: (serviceKey: string) => void;
}) {
  const problematic = services.filter((service) => service.current_status !== "HEALTHY");

  if (size === "small") {
    return (
      <WidgetFrame title="Services Table" subtitle="Problem count">
        <div className="flex h-full flex-col justify-between">
          <div className="text-4xl font-semibold">{problematic.length}</div>
          <div className="text-sm text-slate-500">Problematic services in current filter</div>
        </div>
      </WidgetFrame>
    );
  }

  if (size === "medium") {
    return (
      <WidgetFrame title="Services Table" subtitle="Top issues first">
        <div className="space-y-3 overflow-y-auto">
          {problematic.slice(0, 5).map((service) => (
            <button
              key={service.service_key}
              type="button"
              onClick={() => onSelect(service.service_key)}
              className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{service.name}</div>
                  <div className="text-sm text-slate-600">
                    {service.environment || "default"} • {formatLatency(service.current_latency_ms)}
                  </div>
                </div>
                <StatusBadge status={service.current_status} />
              </div>
            </button>
          ))}
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame title="Services Table" subtitle="Searchable service detail entry point">
      <div className="overflow-hidden rounded-[1.1rem] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Environment</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Latency</th>
              <th className="px-4 py-3 font-semibold">Version</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {services.map((service) => (
              <tr
                key={service.service_key}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => onSelect(service.service_key)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{service.name}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {service.component_type || "service"}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">{service.environment || "default"}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{service.platform || "manual"}</td>
                <td className="px-4 py-3 text-slate-600">{formatLatency(service.current_latency_ms)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {service.current_version || "n/a"} / {service.expected_version}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={service.current_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetFrame>
  );
}
