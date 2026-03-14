import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const recordResult = mutation({
  args: {
    serviceKey: v.string(),
    checkedAt: v.string(),
    httpStatus: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    observedVersion: v.optional(v.string()),
    versionDrift: v.boolean(),
    derivedStatus: v.string(),
    errorMessage: v.optional(v.string()),
    consecutiveFailures: v.number(),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db
      .query("services")
      .withIndex("by_service_key", (q) => q.eq("serviceKey", args.serviceKey))
      .first();
    if (!service) {
      throw new Error(`Unknown service: ${args.serviceKey}`);
    }

    const checkId = await ctx.db.insert("checks", {
      serviceKey: args.serviceKey,
      checkedAt: args.checkedAt,
      httpStatus: args.httpStatus,
      latencyMs: args.latencyMs,
      observedVersion: args.observedVersion,
      versionDrift: args.versionDrift,
      derivedStatus: args.derivedStatus,
      errorMessage: args.errorMessage,
    });

    await ctx.db.patch(service._id, {
      currentStatus: args.derivedStatus,
      currentLatencyMs: args.latencyMs,
      currentVersion: args.observedVersion,
      versionDrift: args.versionDrift,
      consecutiveFailures: args.consecutiveFailures,
      lastCheckedAt: args.checkedAt,
      lastError: args.errorMessage,
      httpStatus: args.httpStatus,
      updatedAt: args.checkedAt,
    });

    return { checkId };
  },
});

export const historyByService = query({
  args: { serviceKey: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("checks")
      .withIndex("by_service_key", (q) => q.eq("serviceKey", args.serviceKey))
      .collect();
    return records
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
      .slice(0, args.limit)
      .map((record) => ({
        service_key: record.serviceKey,
        checked_at: record.checkedAt,
        http_status: record.httpStatus,
        latency_ms: record.latencyMs,
        observed_version: record.observedVersion,
        version_drift: record.versionDrift,
        derived_status: record.derivedStatus,
        error_message: record.errorMessage,
      }));
  },
});

export const recentFleetTrends = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const checks = await ctx.db.query("checks").collect();
    return checks
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
      .slice(0, args.limit)
      .map((record) => ({
        serviceKey: record.serviceKey,
        checkedAt: record.checkedAt,
        latencyMs: record.latencyMs,
        derivedStatus: record.derivedStatus,
      }));
  },
});
