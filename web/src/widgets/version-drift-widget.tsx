import type { ServiceSnapshot } from "@/lib/types";
import type { WidgetSize } from "@/lib/layouts";

import { StatusBadge } from "@/components/status-badge";
import { WidgetFrame } from "@/components/widget-frame";

export function VersionDriftWidget({
  size,
  services,
}: {
  size: WidgetSize;
  services: ServiceSnapshot[];
}) {
  const drifted = services.filter((service) => service.version_drift);

  if (size === "small") {
    return (
      <WidgetFrame title="Version Drift" subtitle="Expected vs observed">
        <div className="flex h-full flex-col justify-between">
          <div className="text-4xl font-semibold">{drifted.length}</div>
          <div className="text-sm text-slate-500">Services drifting right now</div>
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame
      title="Version Drift"
      subtitle={
        drifted.length
          ? "Observed versions differ from the configured expectation."
          : "No version mismatches detected."
      }
    >
      <div className="space-y-3 overflow-y-auto">
        {drifted.length === 0 ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            The monitored fleet is version-aligned.
          </div>
        ) : (
          drifted.slice(0, size === "medium" ? 3 : drifted.length).map((service) => (
            <div
              key={service.service_key}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{service.name}</div>
                  <div className="text-sm text-slate-600">
                    Expected {service.expected_version} • Observed {service.current_version || "n/a"}
                  </div>
                </div>
                <StatusBadge status={service.current_status} />
              </div>
            </div>
          ))
        )}
      </div>
    </WidgetFrame>
  );
}
