import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveArtifact = mutation({
  args: {
    kind: v.string(),
    source: v.string(),
    summary: v.string(),
    payloadJson: v.string(),
    generatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const updatedAt = new Date().toISOString();
    await ctx.db.insert("aiSuggestions", { ...args, updatedAt });
    return { saved: true };
  },
});

export const latestByKind = query({
  args: { kind: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_kind", (q) => q.eq("kind", args.kind))
      .collect();
    return records.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0] ?? null;
  },
});
