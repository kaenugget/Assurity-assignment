import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function mapIncident(record: any) {
  return {
    id: record._id,
    service_key: record.serviceKey,
    incident_type: record.incidentType,
    state: record.state,
    started_at: record.startedAt,
    resolved_at: record.resolvedAt,
    occurrence_count: record.occurrenceCount,
    latest_message: record.latestMessage,
    updated_at: record.updatedAt,
  };
}

export const list = query({
  args: { activeOnly: v.boolean() },
  handler: async (ctx, args) => {
    const incidents = args.activeOnly
      ? await ctx.db.query("incidents").withIndex("by_state", (q) => q.eq("state", "open")).collect()
      : await ctx.db.query("incidents").collect();
    return incidents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(mapIncident);
  },
});

export const listByService = query({
  args: { serviceKey: v.string() },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_service_key", (q) => q.eq("serviceKey", args.serviceKey))
      .collect();
    return incidents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(mapIncident);
  },
});

export const applyTransition = mutation({
  args: {
    serviceKey: v.string(),
    incidentType: v.string(),
    state: v.string(),
    message: v.string(),
    eventAt: v.string(),
  },
  handler: async (ctx, args) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_service_type", (q) =>
        q.eq("serviceKey", args.serviceKey).eq("incidentType", args.incidentType),
      )
      .collect();
    const openIncident = incidents.find((incident) => incident.state === "open");

    if (args.state === "open") {
      if (openIncident) {
        await ctx.db.patch(openIncident._id, {
          occurrenceCount: openIncident.occurrenceCount + 1,
          latestMessage: args.message,
          updatedAt: args.eventAt,
        });
        return { action: "updated", message: args.message };
      }

      await ctx.db.insert("incidents", {
        serviceKey: args.serviceKey,
        incidentType: args.incidentType,
        state: "open",
        startedAt: args.eventAt,
        resolvedAt: undefined,
        occurrenceCount: 1,
        latestMessage: args.message,
        updatedAt: args.eventAt,
      });
      return { action: "opened", message: args.message };
    }

    if (!openIncident) {
      return { action: "noop", message: args.message };
    }

    await ctx.db.patch(openIncident._id, {
      state: "resolved",
      resolvedAt: args.eventAt,
      latestMessage: args.message,
      updatedAt: args.eventAt,
    });
    return { action: "resolved", message: args.message };
  },
});
