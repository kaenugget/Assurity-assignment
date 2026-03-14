import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const layoutItem = v.object({
  i: v.string(),
  x: v.number(),
  y: v.number(),
  w: v.number(),
  h: v.number(),
});

export default defineSchema({
  services: defineTable({
    serviceKey: v.string(),
    name: v.string(),
    url: v.string(),
    expectedVersion: v.string(),
    environment: v.optional(v.string()),
    platform: v.optional(v.string()),
    componentType: v.optional(v.string()),
    timeoutMs: v.number(),
    latencyThresholdMs: v.number(),
    versionSourceType: v.string(),
    versionSourceKey: v.optional(v.string()),
    awsRegion: v.optional(v.string()),
    awsCluster: v.optional(v.string()),
    awsServiceName: v.optional(v.string()),
    deploymentLabel: v.optional(v.string()),
    isActive: v.boolean(),
    currentStatus: v.optional(v.string()),
    currentLatencyMs: v.optional(v.number()),
    currentVersion: v.optional(v.string()),
    versionDrift: v.optional(v.boolean()),
    consecutiveFailures: v.optional(v.number()),
    lastCheckedAt: v.optional(v.string()),
    lastError: v.optional(v.string()),
    httpStatus: v.optional(v.number()),
    updatedAt: v.string(),
  })
    .index("by_service_key", ["serviceKey"])
    .index("by_environment", ["environment"])
    .index("by_platform", ["platform"]),

  checks: defineTable({
    serviceKey: v.string(),
    checkedAt: v.string(),
    httpStatus: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    observedVersion: v.optional(v.string()),
    versionDrift: v.boolean(),
    derivedStatus: v.string(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_service_key", ["serviceKey"])
    .index("by_checked_at", ["checkedAt"]),

  incidents: defineTable({
    serviceKey: v.string(),
    incidentType: v.string(),
    state: v.string(),
    startedAt: v.string(),
    resolvedAt: v.optional(v.string()),
    occurrenceCount: v.number(),
    latestMessage: v.string(),
    updatedAt: v.string(),
  })
    .index("by_service_key", ["serviceKey"])
    .index("by_service_type", ["serviceKey", "incidentType"])
    .index("by_state", ["state"]),

  layouts: defineTable({
    name: v.string(),
    breakpoint: v.string(),
    items: v.array(layoutItem),
    updatedAt: v.string(),
  }).index("by_name_breakpoint", ["name", "breakpoint"]),

  aiSuggestions: defineTable({
    kind: v.string(),
    source: v.string(),
    summary: v.string(),
    payloadJson: v.string(),
    generatedAt: v.string(),
    updatedAt: v.string(),
  }).index("by_kind", ["kind"]),
});
