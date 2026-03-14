import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";

import type { IncidentRecord, ServiceSnapshot } from "@/lib/types";
import { api } from "@/lib/convexApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatLatency } from "@/lib/formatters";

export function ServiceDetailDrawer({ serviceKey }: { serviceKey?: string }) {
  const navigate = useNavigate();
  const detail = useQuery(api.services.getByServiceKey, serviceKey ? { serviceKey } : "skip");
  const history = useQuery(api.checks.historyByService, serviceKey ? { serviceKey, limit: 20 } : "skip");
  const incidents = useQuery(api.incidents.listByService, serviceKey ? { serviceKey } : "skip");

  if (!serviceKey) return null;

  const service = detail as ServiceSnapshot | undefined;
  const serviceHistory = (history as Array<Record<string, unknown>> | undefined) || [];
  const serviceIncidents = (incidents as IncidentRecord[] | undefined) || [];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-slate-950/35">
      <div className="ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-white/40 bg-background/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Service detail
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {service?.name || serviceKey}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <StatusBadge status={service?.current_status} />
              <span className="text-sm text-slate-500">{service?.environment || "default"}</span>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Close
          </Button>
        </div>

        <div className="mt-6 grid gap-4">
          <Card className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Detail label="Current status" value={service?.current_status || "Unknown"} />
              <Detail label="Latency" value={formatLatency(service?.current_latency_ms)} />
              <Detail
                label="Version"
                value={`${service?.current_version || "n/a"} / ${service?.expected_version || "n/a"}`}
              />
              <Detail label="Consecutive failures" value={String(service?.consecutive_failures || 0)} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">Deployment metadata</div>
            <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <Detail label="Platform" value={service?.platform || "n/a"} />
              <Detail label="Component" value={service?.component_type || "n/a"} />
              <Detail label="Region" value={service?.aws_region || "n/a"} />
              <Detail label="Cluster" value={service?.aws_cluster || "n/a"} />
              <Detail label="Service name" value={service?.aws_service_name || "n/a"} />
              <Detail label="Deployment label" value={service?.deployment_label || "n/a"} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">Recent check history</div>
            <div className="mt-3 space-y-3">
              {serviceHistory.map((entry) => (
                <div key={String(entry.checked_at)} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-700">
                      {formatDate(String(entry.checked_at))}
                    </div>
                    <StatusBadge status={String(entry.derived_status)} />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {formatLatency(Number(entry.latency_ms || 0))} • Version {String(entry.observed_version || "n/a")}
                  </div>
                  {entry.error_message ? (
                    <div className="mt-1 text-sm text-red-600">{String(entry.error_message)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm font-semibold text-slate-900">Incident summary</div>
            <div className="mt-3 space-y-3">
              {serviceIncidents.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  No incidents recorded for this service.
                </div>
              ) : (
                serviceIncidents.map((incident) => (
                  <div key={`${incident.incident_type}-${incident.updated_at}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-900">
                        {incident.incident_type.replace(/_/g, " ")}
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {incident.state}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{incident.latest_message}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
