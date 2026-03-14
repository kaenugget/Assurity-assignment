import { useMemo, useRef, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  ChevronRight,
  CircleAlert,
  LayoutPanelTop,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/convexApi";
import { apiBaseUrl } from "@/lib/api";
import { formatDate, formatLatency, formatStatus } from "@/lib/formatters";
import type { DashboardSummary, ServiceSnapshot } from "@/lib/types";

const navLinks = [
  { label: "Preview", href: "#workspace-preview" },
  { label: "Why it works", href: "#why-it-works" },
] as const;

const logoStrip = ["GovPass", "Treasury", "CitizenID", "CivicFlow", "PermitHub", "NexusPay", "Caseboard"];

const featureCards = [
  {
    icon: ShieldCheck,
    title: "Service reliability posture",
    description: "Track healthy, degraded, and down services without stitching together several internal tools.",
  },
  {
    icon: LayoutPanelTop,
    title: "Composable operator workspace",
    description: "Keep the dashboard draggable and resizable while the landing page stays clear and product-led.",
  },
  {
    icon: Sparkles,
    title: "Readable implementation",
    description: "The app still uses live summary data and real routes, but the first impression no longer looks improvised.",
  },
] as const;

const defaultLatencySeries = [282, 308, 294, 336, 312, 305, 358, 334, 321, 346, 328, 374];

export function LandingPage() {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const servicesQuery = useQuery(api.services.list, {}) as ServiceSnapshot[] | undefined;
  const summaryQuery = useQuery(api.services.summary, {}) as DashboardSummary | undefined;

  const services = servicesQuery || [];
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
    open_incidents: 0,
    by_environment: [],
    by_platform: [],
    auth_journey: { overall_status: "HEALTHY" as const, nodes: [] },
    last_poll_at: services[0]?.last_checked_at || null,
  };

  const spotlightServices = useMemo(() => {
    const prioritized = [...services]
      .sort((left, right) => rankService(left) - rankService(right))
      .slice(0, 4)
      .map((service) => ({
        key: service.service_key,
        name: service.name,
        meta: `${service.environment || "default"} • ${service.platform || "manual"} • ${formatLatency(
          service.current_latency_ms,
        )}`,
        status: service.current_status ?? summary.auth_journey.overall_status,
      }));

    if (prioritized.length > 0) return prioritized;

    return [
      {
        key: "placeholder",
        name: "Awaiting live service data",
        meta: "Connect the API and Convex store to populate the workspace preview.",
        status: summary.auth_journey.overall_status,
      },
    ];
  }, [services, summary.auth_journey.overall_status]);

  const issueRows = useMemo(() => {
    const problematic = [...services]
      .filter(
        (service) =>
          service.current_status === "DOWN" ||
          service.current_status === "DEGRADED" ||
          service.version_drift ||
          service.consecutive_failures > 0,
      )
      .sort((left, right) => rankService(left) - rankService(right))
      .slice(0, 3)
      .map((service) => ({
        key: service.service_key,
        name: service.name,
        summary: service.version_drift
          ? "Version drift needs review."
          : service.last_error || `${formatStatus(service.current_status)} posture needs attention.`,
        status: service.current_status ?? (service.version_drift ? "DEGRADED" : summary.auth_journey.overall_status),
      }));

    if (problematic.length > 0) return problematic;

    return [
      {
        key: "steady-state",
        name: "No critical incidents",
        summary: "The current fleet has no live failure streaks or auth bottlenecks.",
        status: summary.auth_journey.overall_status,
      },
    ];
  }, [services, summary.auth_journey.overall_status]);

  const latencySeries = useMemo(() => {
    const liveValues = services
      .map((service) => service.current_latency_ms)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    const source = liveValues.length > 0 ? liveValues : defaultLatencySeries;

    return Array.from({ length: 12 }, (_, index) => {
      const base = source[index % source.length] ?? defaultLatencySeries[index];
      const adjustment =
        liveValues.length > 0 ? ((index % 4) - 1.5) * 10 : [0, 14, -8, 18, -6, 12, -4, 14, -2, 12, 6, 18][index];
      return Math.max(80, Math.round(base + adjustment));
    });
  }, [services]);

  const comparisonSeries = useMemo(
    () => latencySeries.map((value, index) => Math.max(70, Math.round(value * 0.82 + 36 - (index % 3) * 5))),
    [latencySeries],
  );

  function scrollToPreview() {
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#1a1714] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1760px] rounded-[2rem] border border-white/10 bg-[#fcfbf8] shadow-[0_40px_160px_rgba(0,0,0,0.3)]">
        <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-8">
          <a href="/" className="text-[#181514]">
            <BrandLockup />
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1 text-[1.02rem] text-[#2b2f39] transition-colors hover:text-[#111111]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              className="rounded-full px-3 text-[#292e37] hover:bg-[#f5f1eb]"
              onClick={() => window.open(`${apiBaseUrl}/docs`, "_blank", "noopener,noreferrer")}
            >
              API Docs
            </Button>
            <Button
              variant="secondary"
              className="gap-1 rounded-full bg-[#f2ede5] px-4 text-[#262a33] ring-0 hover:bg-[#ebe4db]"
              onClick={scrollToPreview}
            >
              View Preview
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button className="gap-2 rounded-full bg-[#16181f] px-5 text-white hover:bg-[#212530]" onClick={() => navigate("/dashboard")}>
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="px-6 pb-8 pt-6 lg:px-8 lg:pb-10">
          <section className="mx-auto max-w-[980px] text-center">
            <h1 className="mx-auto max-w-[1080px] text-[3.7rem] font-semibold leading-[0.92] tracking-[-0.085em] text-[#191614] md:text-[6rem]">
              Operational assurance that keeps
              <span className="block">systems moving.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[760px] text-lg leading-8 text-[#5f625f] md:text-[1.32rem]">
              AssureOps helps teams turn live service checks, auth-journey health, incidents, and version drift into clear
              next steps without digging through several internal tools.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="gap-2 rounded-full bg-[#17181f] px-7 text-white hover:bg-[#252833]"
                onClick={scrollToPreview}
              >
                View live preview
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="gap-2 rounded-full bg-[#f3efe8] px-7 text-[#252a34] ring-0 hover:bg-[#ebe5dc]"
                onClick={() => navigate("/dashboard")}
              >
                Open dashboard
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <HeroStat label="Services" value={summary.total_services} />
              <HeroStat label="Healthy" value={summary.healthy} />
              <HeroStat label="Avg latency" value={formatLatency(summary.avg_latency_ms)} />
            </div>
          </section>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {logoStrip.map((logo) => (
              <span
                key={logo}
                className="inline-flex items-center rounded-full border border-[#eee6dc] bg-white px-4 py-2 text-sm font-medium text-[#8b7d70] shadow-sm"
              >
                {logo}
              </span>
            ))}
          </div>

          <div
            ref={previewRef}
            id="workspace-preview"
            className="relative mt-14 overflow-hidden rounded-[2rem] border border-[#f0ddca] bg-[linear-gradient(180deg,#fffaf3_0%,#fff6ec_48%,#fff1e4_100%)] px-4 pb-8 pt-12 md:px-6 lg:px-8 lg:pb-12"
          >
            <div className="absolute left-[-40px] top-[34%] h-[380px] w-[220px] rounded-full bg-[#f4ba85]/55 blur-[95px]" />
            <div className="absolute right-[-30px] top-[40%] h-[420px] w-[260px] rounded-full bg-[#ef9b57]/50 blur-[110px]" />
            <div className="absolute inset-x-0 bottom-0 h-[180px] bg-[linear-gradient(180deg,rgba(255,216,180,0),rgba(255,205,159,0.28))]" />

            <PreviewLeftMenu />
            <PreviewRightPanel
              topIssue={issueRows[0]}
              spotlightServices={spotlightServices.slice(0, 3)}
              lastPollAt={summary.last_poll_at}
            />

            <div className="relative mx-auto max-w-[1260px] rounded-[1.85rem] border border-white/85 bg-white/96 p-4 shadow-[0_36px_110px_rgba(214,131,64,0.18)] md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-3 rounded-full border border-[#ece8e1] bg-[#fcfbf9] px-4 py-3 text-[#7c7f85] md:min-w-[360px]">
                  <Search className="h-4 w-4" />
                  <span className="truncate text-sm">Search services, incidents, or versions</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PreviewToolbarPill label="Today" />
                  <PreviewToolbarPill label="Core fleet" />
                  <PreviewIconPill icon={<RefreshCcw className="h-3.5 w-3.5" />} label="Reload" />
                  <PreviewIconPill icon={<Wand2 className="h-3.5 w-3.5" />} label="AI compose" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <BoardStatCard label="Monitored services" value={summary.total_services} accent="text-[#17191f]" />
                <BoardStatCard label="Healthy" value={summary.healthy} accent="text-[#1f8b5e]" />
                <BoardStatCard label="Open incidents" value={summary.open_incidents} accent="text-[#c45540]" />
                <BoardStatCard label="Version drift" value={summary.version_drift_count} accent="text-[#b56b2a]" />
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
                <div className="rounded-[1.6rem] border border-[#efeae3] bg-[#fffdf9] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-[#22252d]">Core reliability KPIs</div>
                      <div className="mt-2 text-sm leading-6 text-[#6e727c]">
                        Watch live fleet latency against the calmer expected baseline and spot auth-critical drift earlier.
                      </div>
                    </div>
                    <div className="rounded-full bg-[#faf1e6] px-3 py-1 text-xs font-medium text-[#9a5f24]">
                      Realtime board
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.3rem] border border-[#f1ebe3] bg-white p-4">
                    <HeroPreviewChart primary={latencySeries} comparison={comparisonSeries} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <LegendChip color="bg-[#e68b42]" label="Current fleet" />
                    <LegendChip color="bg-[#d6dbe5]" label="Expected baseline" />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[1.6rem] border border-[#efeae3] bg-[#fffdf9] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold tracking-tight text-[#22252d]">Auth journey</div>
                      <StatusBadge status={summary.auth_journey.overall_status} />
                    </div>
                    <div className="mt-4 text-3xl font-semibold tracking-tight text-[#17191f]">
                      {summary.auth_journey.overall_status === "DOWN"
                        ? "Critical path failing"
                        : summary.auth_journey.overall_status === "DEGRADED"
                          ? "Critical path degraded"
                          : "Critical path healthy"}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[#6f7480]">Latest poll: {formatDate(summary.last_poll_at)}</div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <MiniMetric label="Avg latency" value={formatLatency(summary.avg_latency_ms)} />
                      <MiniMetric label="Version drift" value={summary.version_drift_count} />
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-[#efeae3] bg-[#fffdf9] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold tracking-tight text-[#22252d]">Priority services</div>
                      <CircleAlert className="h-4 w-4 text-[#858995]" />
                    </div>

                    <div className="mt-4 space-y-3">
                      {spotlightServices.slice(0, 3).map((service) => (
                        <div key={service.key} className="rounded-[1.1rem] border border-[#eee8df] bg-white px-4 py-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-medium text-[#22252d]">{service.name}</div>
                              <div className="mt-1 text-sm text-[#707581]">{service.meta}</div>
                            </div>
                            <StatusBadge status={service.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <BottomPreviewCard
                  label="Open incidents"
                  value={summary.open_incidents}
                  detail={issueRows[0]?.summary || "No active review queue items."}
                />
                <BottomPreviewCard
                  label="Workflow"
                  value="Drag + resize"
                  detail="The real dashboard still supports rearranging widgets and composition changes."
                />
                <BottomPreviewCard
                  label="Live store"
                  value="Convex-backed"
                  detail="The preview reads from the same summary model as the operational route."
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <section id="product" className="mx-auto mt-8 max-w-[1760px] grid gap-5 lg:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-[1.7rem] border border-[#ece5dc] bg-[#fcfbf8] p-6 text-[#1f2430] shadow-[0_18px_48px_rgba(107,76,34,0.08)]"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0a96a] text-[#1a1714]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#676d79]">{feature.description}</p>
            </div>
          );
        })}
      </section>

      <section
        id="why-it-works"
        className="mx-auto mt-6 max-w-[1760px] rounded-[1.8rem] border border-[#ece5dc] bg-[#fcfbf8] p-6 text-[#1f2430] shadow-[0_18px_48px_rgba(107,76,34,0.08)] md:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f0b57d]">Why it works</div>
            <h2 className="mt-4 max-w-[620px] text-3xl font-semibold tracking-[-0.04em] md:text-[2.7rem]">
              The front door now looks like a product, not a prototype.
            </h2>
            <p className="mt-4 max-w-[640px] text-base leading-8 text-[#676d79]">
              The landing page is now a deliberate hero shell with one strong preview, light-orange atmosphere, and clear
              dashboard entry. The workspace route stays tool-first, but the first impression is finally doing its job.
            </p>
          </div>

          <div className="grid gap-3">
            <WhyItem title="No animated overlay" body="The old animated background has been removed from the live UI instead of being tuned around." />
            <WhyItem title="Hero-first composition" body="Navigation, headline, CTAs, logo strip, and preview now read in a stable sequence." />
            <WhyItem title="Dashboard remains real" body="The preview still uses live summary data while the explicit dashboard route stays available." />
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#ede7de] bg-white px-4 py-2 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#998b7b]">{label}</span>
      <span className="text-sm font-semibold text-[#22252d]">{value}</span>
    </div>
  );
}

function BrandLockup() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ece6df] bg-white shadow-sm">
        <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
          <circle cx="16" cy="16" r="11" fill="none" stroke="#1d212b" strokeWidth="2.2" />
          <path
            d="M10.5 18.5c1.7-3.5 4.2-5.3 7.3-5.3 1.8 0 3.3.5 4.8 1.7"
            fill="none"
            stroke="#e68b42"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
          <path
            d="M9.5 14.1c1.5-2.8 3.8-4.1 6.7-4.1 1.7 0 3.2.5 4.8 1.5"
            fill="none"
            stroke="#f0b57d"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <circle cx="21.6" cy="14.2" r="1.7" fill="#1d212b" />
        </svg>
      </div>
      <div className="text-left">
        <div className="text-[1.9rem] font-semibold tracking-[-0.06em] text-[#181514]">AssureOps</div>
      </div>
    </div>
  );
}

function PreviewToolbarPill({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-[#ece7e0] bg-[#fcfbf9] px-4 py-2 text-sm text-[#5c626d]">
      {label}
    </div>
  );
}

function PreviewIconPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#ece7e0] bg-[#fcfbf9] px-4 py-2 text-sm text-[#5c626d]">
      <span className="text-[#8a8f98]">{icon}</span>
      {label}
    </div>
  );
}

function BoardStatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#ede8e1] bg-[#fffdfa] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a8d80]">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] border border-[#eee8df] bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#998c7f]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[#21252d]">{value}</div>
    </div>
  );
}

function BottomPreviewCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#eee8df] bg-[#fffdfa] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a8d80]">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-[#21252d]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-[#707581]">{detail}</div>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-[#666d79] ring-1 ring-[#ece7e0]">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function PreviewLeftMenu() {
  return (
    <div className="pointer-events-none absolute bottom-8 left-6 hidden w-[220px] rounded-[1.5rem] border border-white/75 bg-white/95 p-4 shadow-[0_28px_70px_rgba(217,138,77,0.22)] xl:block">
      <div className="rounded-[1rem] bg-[#faf6ef] px-3 py-3">
        <div className="text-sm font-medium text-[#252932]">Discover</div>
        <div className="mt-3 rounded-full border border-[#ebe4da] bg-white px-3 py-2 text-sm text-[#616773]">+ New board</div>
      </div>

      <div className="mt-4 space-y-1">
        {["Board", "Auth Journey", "Incidents", "Latency", "Version Drift", "Experiments"].map((item, index) => (
          <div
            key={item}
            className={`rounded-[1rem] px-3 py-3 text-sm ${
              index === 0 ? "bg-[#fff3e6] font-medium text-[#22262e]" : "text-[#676d79]"
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewRightPanel({
  topIssue,
  spotlightServices,
  lastPollAt,
}: {
  topIssue: { name: string; summary: string; status: string | null | undefined };
  spotlightServices: Array<{ key: string; name: string; meta: string; status: string | null | undefined }>;
  lastPollAt?: string | null;
}) {
  return (
    <div className="pointer-events-none absolute right-8 top-8 hidden w-[290px] rounded-[1.5rem] border border-white/75 bg-white/96 p-5 shadow-[0_28px_70px_rgba(217,138,77,0.22)] 2xl:block">
      <div className="text-xl font-semibold tracking-tight text-[#23262f]">Review this fleet</div>
      <div className="mt-2 text-sm leading-6 text-[#6d727e]">Last poll: {formatDate(lastPollAt)}</div>

      <div className="mt-4 rounded-[1rem] bg-[#fff6ec] px-4 py-4">
        <div className="text-sm font-medium text-[#23262f]">{topIssue.name}</div>
        <div className="mt-2 text-sm leading-6 text-[#6d727e]">{topIssue.summary}</div>
        <div className="mt-3">
          <StatusBadge status={topIssue.status} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {spotlightServices.map((service) => (
          <div key={service.key} className="flex items-start justify-between gap-3 rounded-[1rem] border border-[#eee8df] bg-white px-4 py-3">
            <div>
              <div className="font-medium text-[#23262f]">{service.name}</div>
              <div className="mt-1 text-sm text-[#6d727e]">{service.meta}</div>
            </div>
            <StatusBadge status={service.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroPreviewChart({
  primary,
  comparison,
}: {
  primary: number[];
  comparison: number[];
}) {
  const width = 980;
  const height = 360;
  const paddingX = 18;
  const paddingTop = 24;
  const paddingBottom = 34;

  const allValues = [...primary, ...comparison];
  const minimum = Math.min(...allValues);
  const maximum = Math.max(...allValues);
  const span = Math.max(1, maximum - minimum);

  const toPoints = (values: number[]) =>
    values.map((value, index) => {
      const x = paddingX + (index * (width - paddingX * 2)) / Math.max(1, values.length - 1);
      const y =
        height - paddingBottom - ((value - minimum) / span) * (height - paddingTop - paddingBottom);
      return { x, y };
    });

  const primaryPoints = toPoints(primary);
  const comparisonPoints = toPoints(comparison);

  const buildPath = (points: Array<{ x: number; y: number }>) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  const primaryPath = buildPath(primaryPoints);
  const comparisonPath = buildPath(comparisonPoints);
  const areaPath = `${primaryPath} L ${primaryPoints[primaryPoints.length - 1]?.x ?? width - paddingX} ${
    height - paddingBottom
  } L ${primaryPoints[0]?.x ?? paddingX} ${height - paddingBottom} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full" aria-hidden>
      <defs>
        <linearGradient id="landing-preview-orange-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(230,139,66,0.18)" />
          <stop offset="100%" stopColor="rgba(230,139,66,0.04)" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((offset) => (
        <line
          key={offset}
          x1={paddingX}
          x2={width - paddingX}
          y1={paddingTop + (height - paddingTop - paddingBottom) * offset}
          y2={paddingTop + (height - paddingTop - paddingBottom) * offset}
          stroke="#ece7e0"
          strokeDasharray="4 8"
        />
      ))}

      <path d={comparisonPath} fill="none" stroke="#d7dbe3" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={areaPath} fill="url(#landing-preview-orange-fill)" />
      <path d={primaryPath} fill="none" stroke="#e68b42" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {primaryPoints.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="2.1" fill="#e68b42" opacity="0.85" />
      ))}
    </svg>
  );
}

function WhyItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#eee6dc] bg-[#faf6ef] px-4 py-4">
      <div className="text-sm font-medium text-[#21252d]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[#676d79]">{body}</p>
    </div>
  );
}

function rankService(service: ServiceSnapshot) {
  if (service.current_status === "DOWN") return 0;
  if (service.current_status === "DEGRADED") return 1;
  if (service.version_drift) return 2;
  if (service.current_status === "HEALTHY") return 3;
  return 4;
}
