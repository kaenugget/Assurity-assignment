import type { Layout, Layouts } from "react-grid-layout";

export type WidgetSize = "small" | "medium" | "large";
export type LayoutBreakpoint = "lg" | "md" | "sm";

export const widgetRegistry = [
  "fleetOverview",
  "environmentHealth",
  "platformFootprint",
  "versionDrift",
  "latencyTrends",
  "recentIncidents",
  "servicesTable",
  "authJourneyHealth",
] as const;

export type WidgetKey = (typeof widgetRegistry)[number];

export const gridBreakpoints = { lg: 1200, md: 996, sm: 0 } as const;
export const gridColumns: Record<LayoutBreakpoint, number> = { lg: 12, md: 12, sm: 2 };
export const gridMargin: [number, number] = [16, 16];
export const gridRowHeight = 40;

const widgetMinHeights: Record<WidgetKey, number> = {
  fleetOverview: 4,
  environmentHealth: 4,
  platformFootprint: 4,
  versionDrift: 4,
  latencyTrends: 5,
  recentIncidents: 5,
  servicesTable: 6,
  authJourneyHealth: 5,
};

export const defaultLayouts: Layouts = {
  lg: [
    { i: "fleetOverview", x: 0, y: 0, w: 3, h: 4, minH: 4 },
    { i: "environmentHealth", x: 3, y: 0, w: 3, h: 4, minH: 4 },
    { i: "platformFootprint", x: 6, y: 0, w: 3, h: 4, minH: 4 },
    { i: "versionDrift", x: 9, y: 0, w: 3, h: 4, minH: 4 },
    { i: "authJourneyHealth", x: 0, y: 4, w: 6, h: 5, minH: 5 },
    { i: "latencyTrends", x: 6, y: 4, w: 6, h: 5, minH: 5 },
    { i: "recentIncidents", x: 0, y: 9, w: 5, h: 5, minH: 5 },
    { i: "servicesTable", x: 5, y: 9, w: 7, h: 6, minH: 6 },
  ],
  md: [
    { i: "fleetOverview", x: 0, y: 0, w: 4, h: 4, minH: 4 },
    { i: "environmentHealth", x: 4, y: 0, w: 4, h: 4, minH: 4 },
    { i: "platformFootprint", x: 8, y: 0, w: 4, h: 4, minH: 4 },
    { i: "versionDrift", x: 0, y: 4, w: 4, h: 4, minH: 4 },
    { i: "authJourneyHealth", x: 4, y: 4, w: 8, h: 5, minH: 5 },
    { i: "latencyTrends", x: 0, y: 8, w: 6, h: 5, minH: 5 },
    { i: "recentIncidents", x: 6, y: 9, w: 6, h: 5, minH: 5 },
    { i: "servicesTable", x: 0, y: 14, w: 12, h: 6, minH: 6 },
  ],
  sm: [
    { i: "fleetOverview", x: 0, y: 0, w: 2, h: 4, minH: 4 },
    { i: "environmentHealth", x: 0, y: 4, w: 2, h: 4, minH: 4 },
    { i: "platformFootprint", x: 0, y: 8, w: 2, h: 4, minH: 4 },
    { i: "versionDrift", x: 0, y: 12, w: 2, h: 4, minH: 4 },
    { i: "authJourneyHealth", x: 0, y: 16, w: 2, h: 5, minH: 5 },
    { i: "latencyTrends", x: 0, y: 21, w: 2, h: 5, minH: 5 },
    { i: "recentIncidents", x: 0, y: 26, w: 2, h: 5, minH: 5 },
    { i: "servicesTable", x: 0, y: 31, w: 2, h: 6, minH: 6 },
  ],
};

function collides(a: Layout, b: Layout) {
  if (a.i === b.i) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function constrainItem(item: Layout, breakpoint: LayoutBreakpoint): Layout {
  const cols = gridColumns[breakpoint];
  const minH = widgetMinHeights[item.i as WidgetKey] ?? 4;
  const w = Math.max(1, Math.min(item.w, cols));
  return {
    ...item,
    x: Math.max(0, Math.min(item.x, cols - w)),
    y: Math.max(0, item.y),
    w,
    h: Math.max(item.h, minH),
    minH,
  };
}

function compactLayout(items: Layout[], breakpoint: LayoutBreakpoint) {
  const placed: Layout[] = [];
  for (const item of items.map((current) => constrainItem(current, breakpoint)).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const next = { ...item };
    while (placed.some((existing) => collides(existing, next))) {
      next.y += 1;
    }
    placed.push(next);
  }
  return placed;
}

function normalizeBreakpoint(
  breakpoint: LayoutBreakpoint,
  items: Layout[] | undefined,
) {
  return compactLayout(items?.length ? items : defaultLayouts[breakpoint], breakpoint);
}

export function resolveWidgetSize(item: Layout): WidgetSize {
  if (item.w <= 3 || item.h <= 2) return "small";
  if (item.w >= 6 && item.h >= 4) return "large";
  return "medium";
}

export function normalizeLayouts(input?: Layouts | Record<string, Layout[]> | null): Layouts {
  return {
    lg: normalizeBreakpoint("lg", input?.lg),
    md: normalizeBreakpoint("md", input?.md),
    sm: normalizeBreakpoint("sm", input?.sm),
  };
}

export function serializeLayouts(layouts: Layouts) {
  const prune = (items: Layout[]) =>
    items.map((item) => ({ i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }));
  return {
    lg: prune(layouts.lg || defaultLayouts.lg),
    md: prune(layouts.md || defaultLayouts.md),
    sm: prune(layouts.sm || defaultLayouts.sm),
  };
}
