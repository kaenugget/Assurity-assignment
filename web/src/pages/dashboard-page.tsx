import { startTransition, useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { Activity, ArrowLeft, LayoutPanelTop, RotateCcw, ServerCog, Sparkles, Wand2 } from "lucide-react";
import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import { useNavigate, useParams } from "react-router-dom";

import { AssureOpsMark } from "@/components/assureops-mark";
import { api } from "@/lib/convexApi";
import { apiBaseUrl, checkNow, generateIncidentSummary, generateLayoutSuggestion, reloadConfig } from "@/lib/api";
import {
  defaultLayouts,
  gridBreakpoints,
  gridColumns,
  gridMargin,
  gridRowHeight,
  normalizeLayouts,
  resolveWidgetSize,
  serializeLayouts,
  widgetRegistry,
} from "@/lib/layouts";
import type {
  DashboardSummary,
  FleetTrend,
  IncidentRecord,
  LayoutsResponse,
  LayoutSuggestionResponse,
  ServiceSnapshot,
} from "@/lib/types";
import { FilterBar } from "@/components/filter-bar";
import { LayoutPreviewModal } from "@/components/layout-preview-modal";
import { ServiceDetailDrawer } from "@/components/service-detail-drawer";
import { SummaryStrip } from "@/components/summary-strip";
import { Button } from "@/components/ui/button";
import { AuthJourneyHealthWidget } from "@/widgets/auth-journey-health-widget";
import { EnvironmentHealthWidget } from "@/widgets/environment-health-widget";
import { FleetOverviewWidget } from "@/widgets/fleet-overview-widget";
import { LatencyTrendsWidget } from "@/widgets/latency-trends-widget";
import { PlatformFootprintWidget } from "@/widgets/platform-footprint-widget";
import { RecentIncidentsWidget } from "@/widgets/recent-incidents-widget";
import { ServicesTableWidget } from "@/widgets/services-table-widget";
import { VersionDriftWidget } from "@/widgets/version-drift-widget";

const ResponsiveGridLayout = WidthProvider(Responsive);

export function DashboardPage() {
  const navigate = useNavigate();
  const { serviceKey } = useParams<{ serviceKey?: string }>();
  const saveLayout = useMutation(api.layouts.saveLayout);

  const servicesQuery = useQuery(api.services.list, {}) as ServiceSnapshot[] | undefined;
  const summaryQuery = useQuery(api.services.summary, {}) as DashboardSummary | undefined;
  const incidentsQuery = useQuery(api.incidents.list, { activeOnly: false }) as IncidentRecord[] | undefined;
  const layoutsQuery = useQuery(api.layouts.getActive, { name: "default" }) as LayoutsResponse | undefined;
  const trendsQuery = useQuery(api.checks.recentFleetTrends, { limit: 40 }) as FleetTrend[] | undefined;
  const aiSummaryQuery = useQuery(api.aiSuggestions.latestByKind, { kind: "incident_summary" }) as
    | { summary: string }
    | undefined;

  const services = servicesQuery || [];
  const incidents = incidentsQuery || [];
  const trends = trendsQuery || [];
  const summary = summaryQuery || {
    total_services: services.length,
    healthy: services.filter((item) => item.current_status === "HEALTHY").length,
    degraded: services.filter((item) => item.current_status === "DEGRADED").length,
    down: services.filter((item) => item.current_status === "DOWN").length,
    version_drift_count: services.filter((item) => item.version_drift).length,
    avg_latency_ms:
      services.length > 0
        ? services.reduce((sum, item) => sum + (item.current_latency_ms || 0), 0) / services.length
        : 0,
    open_incidents: incidents.filter((item) => item.state === "open").length,
    by_environment: [],
    by_platform: [],
    auth_journey: { overall_status: "HEALTHY" as const, nodes: [] },
    last_poll_at: services[0]?.last_checked_at || null,
  };

  const [filters, setFilters] = useState({
    search: "",
    environment: "all",
    platform: "all",
    status: "all",
    problematicOnly: false,
  });
  const deferredSearch = useDeferredValue(filters.search);
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [hydratedLayouts, setHydratedLayouts] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<keyof Layouts>("lg");
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<LayoutSuggestionResponse | null>(null);

  useEffect(() => {
    if (!layoutsQuery || hydratedLayouts) return;
    startTransition(() => {
      setLayouts(normalizeLayouts(layoutsQuery.layouts));
      setHydratedLayouts(true);
    });
  }, [hydratedLayouts, layoutsQuery]);

  useEffect(() => {
    if (!hydratedLayouts) return;
    const timer = window.setTimeout(() => {
      void saveLayout({ name: "default", layouts: serializeLayouts(layouts) });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [hydratedLayouts, layouts, saveLayout]);

  const filteredServices = services.filter((service) => {
    const haystack = [
      service.name,
      service.service_key,
      service.environment || "",
      service.platform || "",
      service.current_version || "",
      service.expected_version,
    ]
      .join(" ")
      .toLowerCase();

    if (deferredSearch && !haystack.includes(deferredSearch.toLowerCase())) return false;
    if (filters.environment !== "all" && service.environment !== filters.environment) return false;
    if (filters.platform !== "all" && service.platform !== filters.platform) return false;
    if (filters.status !== "all" && service.current_status !== filters.status) return false;
    if (filters.problematicOnly && service.current_status === "HEALTHY") return false;
    return true;
  });

  const filteredSummary: DashboardSummary = {
    ...summary,
    total_services: filteredServices.length,
    healthy: filteredServices.filter((item) => item.current_status === "HEALTHY").length,
    degraded: filteredServices.filter((item) => item.current_status === "DEGRADED").length,
    down: filteredServices.filter((item) => item.current_status === "DOWN").length,
    version_drift_count: filteredServices.filter((item) => item.version_drift).length,
    open_incidents: incidents.filter(
      (item) =>
        item.state === "open" &&
        filteredServices.some((service) => service.service_key === item.service_key),
    ).length,
    avg_latency_ms:
      filteredServices.length > 0
        ? filteredServices.reduce((sum, item) => sum + (item.current_latency_ms || 0), 0) / filteredServices.length
        : 0,
  };

  const filteredIncidentKeys = new Set(filteredServices.map((service) => service.service_key));
  const filteredIncidents = incidents.filter((incident) => filteredIncidentKeys.has(incident.service_key));
  const environments = Array.from(new Set(services.map((service) => service.environment).filter(Boolean) as string[]));
  const platforms = Array.from(new Set(services.map((service) => service.platform).filter(Boolean) as string[]));

  const widgetMap = {
    fleetOverview: (item: Layout) => <FleetOverviewWidget size={resolveWidgetSize(item)} summary={filteredSummary} />,
    environmentHealth: (item: Layout) => (
      <EnvironmentHealthWidget size={resolveWidgetSize(item)} services={filteredServices} />
    ),
    platformFootprint: (item: Layout) => (
      <PlatformFootprintWidget size={resolveWidgetSize(item)} services={filteredServices} />
    ),
    versionDrift: (item: Layout) => <VersionDriftWidget size={resolveWidgetSize(item)} services={filteredServices} />,
    latencyTrends: (item: Layout) => (
      <LatencyTrendsWidget size={resolveWidgetSize(item)} services={filteredServices} trends={trends} />
    ),
    recentIncidents: (item: Layout) => (
      <RecentIncidentsWidget
        size={resolveWidgetSize(item)}
        incidents={filteredIncidents}
        aiSummary={aiSummaryQuery?.summary}
        onGenerateSummary={async () => {
          try {
            setSummaryLoading(true);
            const result = await generateIncidentSummary();
            setMessage(`AI incident summary refreshed via ${result.source}.`);
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setSummaryLoading(false);
          }
        }}
        summaryLoading={summaryLoading}
      />
    ),
    servicesTable: (item: Layout) => (
      <ServicesTableWidget
        size={resolveWidgetSize(item)}
        services={filteredServices}
        onSelect={(nextServiceKey) => navigate(`/dashboard/services/${nextServiceKey}`)}
      />
    ),
    authJourneyHealth: (item: Layout) => (
      <AuthJourneyHealthWidget size={resolveWidgetSize(item)} summary={summary} />
    ),
  } as const;

  async function runAction(kind: "check" | "reload" | "compose" | "reset") {
    try {
      setActionLoading(kind);
      if (kind === "check") {
        const result = await checkNow();
        setMessage(result.message);
        return;
      }
      if (kind === "reload") {
        const result = await reloadConfig();
        setMessage(`Reloaded ${result.loaded_services} services from ${result.source_path}.`);
        return;
      }
      if (kind === "compose") {
        const result = await generateLayoutSuggestion({
          services: filteredServices,
          incidents: filteredIncidents,
          viewportWidth: window.innerWidth,
          columns: 12,
          allowedWidgets: [...widgetRegistry],
        });
        setSuggestion(result);
        return;
      }
      setLayouts(defaultLayouts);
      await saveLayout({ name: "default", layouts: serializeLayouts(defaultLayouts) });
      setMessage("Dashboard layout reset to the deterministic preset.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  const activeLayout = layouts[currentBreakpoint] || defaultLayouts[currentBreakpoint] || defaultLayouts.lg;

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-120px] h-[520px] w-[520px] rounded-full bg-[#f8d8b2]/45 blur-[130px]" />
        <div className="absolute right-[-120px] top-[40px] h-[440px] w-[440px] rounded-full bg-[#f5e4cf]/65 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,244,236,0.92)_56%,rgba(246,242,235,0.98))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 md:px-8">
        <div className="flex flex-col gap-6">
          <header className="rounded-[1.45rem] border border-white/70 bg-white/72 p-5 shadow-panel backdrop-blur md:p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-4">
                  <AssureOpsMark />
                  <div className="hidden h-10 w-px bg-slate-200 md:block" />
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Dashboard / Live Ops Workspace
                  </div>
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.5rem]">
                  Operational assurance workspace.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  Live fleet checks, version drift, incidents, and dashboard composition stay in one place. This route
                  is intentionally tool-first now that the landing page handles the hero narrative.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 xl:max-w-[720px] xl:justify-end">
                <DashboardAction
                  icon={<Activity className="h-4 w-4" />}
                  label={actionLoading === "check" ? "Running..." : "Check Now"}
                  onClick={() => void runAction("check")}
                />
                <DashboardAction
                  icon={<ServerCog className="h-4 w-4" />}
                  label={actionLoading === "reload" ? "Reloading..." : "Reload Config"}
                  onClick={() => void runAction("reload")}
                />
                <DashboardAction
                  icon={<LayoutPanelTop className="h-4 w-4" />}
                  label="API Docs"
                  onClick={() => window.open(`${apiBaseUrl}/docs`, "_blank", "noopener,noreferrer")}
                />
                <DashboardAction
                  icon={<Sparkles className="h-4 w-4" />}
                  label={actionLoading === "compose" ? "Composing..." : "AI Compose Layout"}
                  onClick={() => void runAction("compose")}
                />
                <DashboardAction
                  icon={<RotateCcw className="h-4 w-4" />}
                  label={actionLoading === "reset" ? "Resetting..." : "Reset Layout"}
                  onClick={() => void runAction("reset")}
                />
                <Button variant="ghost" className="gap-2 rounded-full px-4" onClick={() => navigate("/")}>
                  <ArrowLeft className="h-4 w-4" />
                  Landing
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 uppercase tracking-[0.18em] text-[11px] text-slate-500">
                Live store
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5">
                <Wand2 className="h-4 w-4 text-slate-500" />
                Convex-backed dashboard
              </span>
              <span className="rounded-full bg-white/60 px-3 py-1.5">Drag widgets by their headers and resize from the corner.</span>
            </div>
          </header>

          {message ? (
            <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700">
              {message}
            </div>
          ) : null}

          <div id="summary-strip">
            <SummaryStrip summary={filteredSummary} />
          </div>

          <div id="filter-bar">
            <FilterBar
              filters={filters}
              environments={environments}
              platforms={platforms}
              onChange={setFilters}
            />
          </div>

          <div id="dashboard-grid">
            <ResponsiveGridLayout
              className="layout"
              rowHeight={gridRowHeight}
              layouts={layouts}
              breakpoints={gridBreakpoints}
              cols={gridColumns}
              margin={gridMargin}
              isResizable
              isDraggable
              draggableHandle=".grid-item-handle"
              onBreakpointChange={(breakpoint: string) => setCurrentBreakpoint(breakpoint as keyof Layouts)}
              onLayoutChange={(_: Layout[], allLayouts: Layouts) =>
                startTransition(() => setLayouts(normalizeLayouts(allLayouts)))
              }
            >
              {activeLayout.map((item: Layout) => (
                <div key={item.i} id={`widget-${item.i}`} className="h-full scroll-mt-24">
                  {widgetMap[item.i as keyof typeof widgetMap](item)}
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </div>
      </div>

      <ServiceDetailDrawer serviceKey={serviceKey} />
      <LayoutPreviewModal
        suggestion={suggestion}
        onClose={() => setSuggestion(null)}
        onApply={async () => {
          if (!suggestion) return;
          const nextLayouts: Layouts = {
            ...layouts,
            lg: suggestion.layout.map((item) => ({
              i: item.widgetType,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            })),
          };
          setLayouts(nextLayouts);
          await saveLayout({ name: "default", layouts: serializeLayouts(nextLayouts) });
          setSuggestion(null);
          setMessage(`Applied ${suggestion.source} layout suggestion.`);
        }}
      />
    </div>
  );
}

function DashboardAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="secondary" className="gap-2 rounded-full px-4" onClick={onClick}>
      <span className="rounded-full bg-slate-100 p-2 text-slate-700">{icon}</span>
      <span>{label}</span>
    </Button>
  );
}
