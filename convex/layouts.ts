import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const layoutItem = v.object({
  i: v.string(),
  x: v.number(),
  y: v.number(),
  w: v.number(),
  h: v.number(),
});

const layoutsValidator = v.object({
  lg: v.array(layoutItem),
  md: v.array(layoutItem),
  sm: v.array(layoutItem),
});

export const getActive = query({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const name = args.name ?? "default";
    const records = await ctx.db
      .query("layouts")
      .withIndex("by_name_breakpoint", (q) => q.eq("name", name))
      .collect();
    const response: Record<string, any[]> = { lg: [], md: [], sm: [] };
    for (const record of records) {
      response[record.breakpoint] = record.items;
    }
    return { name, layouts: response };
  },
});

export const ensureDefault = mutation({
  args: { name: v.string(), layouts: layoutsValidator },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("layouts")
      .withIndex("by_name_breakpoint", (q) => q.eq("name", args.name))
      .collect();
    if (existing.length > 0) {
      return { name: args.name, created: false };
    }
    const updatedAt = new Date().toISOString();
    for (const breakpoint of ["lg", "md", "sm"] as const) {
      await ctx.db.insert("layouts", {
        name: args.name,
        breakpoint,
        items: args.layouts[breakpoint],
        updatedAt,
      });
    }
    return { name: args.name, created: true };
  },
});

export const saveLayout = mutation({
  args: { name: v.string(), layouts: layoutsValidator },
  handler: async (ctx, args) => {
    const updatedAt = new Date().toISOString();
    for (const breakpoint of ["lg", "md", "sm"] as const) {
      const existing = await ctx.db
        .query("layouts")
        .withIndex("by_name_breakpoint", (q) =>
          q.eq("name", args.name).eq("breakpoint", breakpoint),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { items: args.layouts[breakpoint], updatedAt });
      } else {
        await ctx.db.insert("layouts", {
          name: args.name,
          breakpoint,
          items: args.layouts[breakpoint],
          updatedAt,
        });
      }
    }
    return { name: args.name, saved: true };
  },
});
