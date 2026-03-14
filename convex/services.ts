import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const serviceConfigValidator = v.object({
  service_key: v.string(),
  name: v.string(),
  url: v.string(),
  expected_version: v.string(),
  environment: v.optional(v.string()),
  platform: v.optional(v.string()),
  component_type: v.optional(v.string()),
  timeout_ms: v.number(),
  latency_threshold_ms: v.number(),
  version_source_type: v.string(),
  version_source_key: v.optional(v.string()),
  aws_region: v.optional(v.string()),
  aws_cluster: v.optional(v.string()),
  aws_service_name: v.optional(v.string()),
  deployment_label: v.optional(v.string()),
  is_active: v.boolean(),
});

function severity(status?: string): number {
  if (status === "DOWN") return 0;
  if (status === "DEGRADED") return 1;
  return 2;
}

function serializeService(record: any) {
  return {
    service_key: record.serviceKey,
    name: record.name,
    url: record.url,
    expected_version: record.expectedVersion,
    environment: record.environment,
    platform: record.platform,
    component_type: record.componentType,
    timeout_ms: record.timeoutMs,
    latency_threshold_ms: record.latencyThresholdMs,
    version_source_type: record.versionSourceType,
    version_source_key: record.versionSourceKey,
    aws_region: record.awsRegion,
    aws_cluster: record.awsCluster,
    aws_service_name: record.awsServiceName,
    deployment_label: record.deploymentLabel,
    is_active: record.isActive,
    current_status: record.currentStatus,
    current_latency_ms: record.currentLatencyMs,
    current_version: record.currentVersion,
    version_drift: record.versionDrift ?? false,
    consecutive_failures: record.consecutiveFailures ?? 0,
    last_checked_at: record.lastCheckedAt,
    last_error: record.lastError,
    http_status: record.httpStatus,
    updated_at: record.updatedAt,
  };
}

function sortServices(a: any, b: any): number {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  const statusOrder = severity(a.currentStatus) - severity(b.currentStatus);
  if (statusOrder !== 0) return statusOrder;
  return a.name.localeCompare(b.name);
}

function buildBucket(records: any[], labelKey: "environment" | "platform") {
  const map = new Map<string, { label: string; total: number; healthy: number; degraded: number; down: number }>();
  for (const record of records) {
    const label = record[labelKey] || "unassigned";
    const existing = map.get(label) || { label, total: 0, healthy: 0, degraded: 0, down: 0 };
    existing.total += 1;
    if (record.currentStatus === "HEALTHY") existing.healthy += 1;
    if (record.currentStatus === "DEGRADED") existing.degraded += 1;
    if (record.currentStatus === "DOWN") existing.down += 1;
    map.set(label, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function authJourney(services: any[]) {
  const chain = [
    ["Authorize", "authorize"],
    ["Token", "token"],
    ["Callback", "callback"],
    ["Profile", "profile"],
    ["App API", "app_api"],
  ] as const;

  const nodes = chain.map(([label, componentType]) => {
    const service = services.find((item) => item.componentType === componentType);
    return {
      label,
      service_key: service?.serviceKey ?? null,
      status: service?.currentStatus ?? null,
      latency_ms: service?.currentLatencyMs ?? null,
      version_drift: service?.versionDrift ?? false,
    };
  });

  const broken = nodes.find((node) => node.status === "DOWN");
  if (broken) {
    return { overall_status: "DOWN", bottleneck: broken.service_key, nodes };
  }

  const drift = nodes.find((node) => node.version_drift);
  if (drift) {
    return { overall_status: "DEGRADED", bottleneck: drift.service_key, nodes };
  }

  const slow = nodes.find((node) => node.status === "DEGRADED");
  if (slow) {
    return { overall_status: "DEGRADED", bottleneck: slow.service_key, nodes };
  }

  return { overall_status: "HEALTHY", bottleneck: null, nodes };
}

export const syncConfig = mutation({
  args: { services: v.array(serviceConfigValidator) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("services").collect();
    const existingByKey = new Map(existing.map((record) => [record.serviceKey, record]));
    const seen = new Set<string>();

    for (const service of args.services) {
      const now = new Date().toISOString();
      seen.add(service.service_key);
      const current = existingByKey.get(service.service_key);
      const payload = {
        serviceKey: service.service_key,
        name: service.name,
        url: service.url,
        expectedVersion: service.expected_version,
        environment: service.environment,
        platform: service.platform,
        componentType: service.component_type,
        timeoutMs: service.timeout_ms,
        latencyThresholdMs: service.latency_threshold_ms,
        versionSourceType: service.version_source_type,
        versionSourceKey: service.version_source_key,
        awsRegion: service.aws_region,
        awsCluster: service.aws_cluster,
        awsServiceName: service.aws_service_name,
        deploymentLabel: service.deployment_label,
        isActive: service.is_active,
        updatedAt: now,
      };

      if (current) {
        await ctx.db.patch(current._id, payload);
      } else {
        await ctx.db.insert("services", {
          ...payload,
          currentStatus: undefined,
          currentLatencyMs: undefined,
          currentVersion: undefined,
          versionDrift: false,
          consecutiveFailures: 0,
          lastCheckedAt: undefined,
          lastError: undefined,
          httpStatus: undefined,
        });
      }
    }

    let deactivatedCount = 0;
    for (const record of existing) {
      if (!seen.has(record.serviceKey) && record.isActive) {
        await ctx.db.patch(record._id, { isActive: false, updatedAt: new Date().toISOString() });
        deactivatedCount += 1;
      }
    }

    return { activeCount: args.services.length, deactivatedCount };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return services.sort(sortServices).map(serializeService);
  },
});

export const getByServiceKey = query({
  args: { serviceKey: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("services")
      .withIndex("by_service_key", (q) => q.eq("serviceKey", args.serviceKey))
      .first();
    return record ? serializeService(record) : null;
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const services = (await ctx.db.query("services").collect()).filter((service) => service.isActive);
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_state", (q) => q.eq("state", "open"))
      .collect();

    const healthy = services.filter((service) => service.currentStatus === "HEALTHY").length;
    const degraded = services.filter((service) => service.currentStatus === "DEGRADED").length;
    const down = services.filter((service) => service.currentStatus === "DOWN").length;
    const drift = services.filter((service) => service.versionDrift).length;
    const latencyValues = services
      .map((service) => service.currentLatencyMs)
      .filter((value): value is number => typeof value === "number");
    const avgLatencyMs = latencyValues.length
      ? Number((latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length).toFixed(2))
      : 0;
    const lastPollAt = services
      .map((service) => service.lastCheckedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

    return {
      total_services: services.length,
      healthy,
      degraded,
      down,
      version_drift_count: drift,
      avg_latency_ms: avgLatencyMs,
      open_incidents: incidents.length,
      by_environment: buildBucket(services, "environment"),
      by_platform: buildBucket(services, "platform"),
      auth_journey: authJourney(services),
      last_poll_at: lastPollAt,
    };
  },
});
