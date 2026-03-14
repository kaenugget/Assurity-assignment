import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FleetOverviewWidget } from "@/widgets/fleet-overview-widget";
import { normalizeLayouts, resolveWidgetSize } from "@/lib/layouts";

const summary = {
  total_services: 7,
  healthy: 4,
  degraded: 2,
  down: 1,
  version_drift_count: 1,
  avg_latency_ms: 320,
  open_incidents: 2,
  by_environment: [],
  by_platform: [],
  auth_journey: { overall_status: "DEGRADED" as const, nodes: [] },
  last_poll_at: null,
};

describe("adaptive widget sizing", () => {
  it("maps layout dimensions into small, medium, and large widget variants", () => {
    expect(resolveWidgetSize({ i: "fleetOverview", x: 0, y: 0, w: 3, h: 2 })).toBe("small");
    expect(resolveWidgetSize({ i: "fleetOverview", x: 0, y: 0, w: 4, h: 3 })).toBe("medium");
    expect(resolveWidgetSize({ i: "fleetOverview", x: 0, y: 0, w: 6, h: 4 })).toBe("large");
  });

  it("renders variant-specific content", () => {
    const { rerender } = render(<FleetOverviewWidget size="small" summary={summary} />);
    expect(screen.getByText("Monitored services")).toBeInTheDocument();

    rerender(<FleetOverviewWidget size="medium" summary={summary} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();

    rerender(<FleetOverviewWidget size="large" summary={summary} />);
    expect(screen.getByText("Open incidents")).toBeInTheDocument();
  });

  it("repairs undersized persisted layouts before rendering", () => {
    const layouts = normalizeLayouts({
      lg: [
        { i: "fleetOverview", x: 0, y: 0, w: 3, h: 2 },
        { i: "authJourneyHealth", x: 0, y: 2, w: 6, h: 4 },
      ],
      md: [],
      sm: [],
    });

    expect(layouts.lg[0]).toMatchObject({ i: "fleetOverview", h: 4, minH: 4, y: 0 });
    expect(layouts.lg[1]).toMatchObject({ i: "authJourneyHealth", h: 5, minH: 5, y: 4 });
  });
});
