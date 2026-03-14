import type { ChangeEvent } from "react";

import { Search, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterState = {
  search: string;
  environment: string;
  platform: string;
  status: string;
  problematicOnly: boolean;
};

export function FilterBar({
  filters,
  environments,
  platforms,
  onChange,
}: {
  filters: FilterState;
  environments: string[];
  platforms: string[];
  onChange: (next: FilterState) => void;
}) {
  const handle =
    (key: keyof FilterState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        event.currentTarget instanceof HTMLInputElement &&
        event.currentTarget.type === "checkbox"
          ? event.currentTarget.checked
          : event.currentTarget.value;
      onChange({ ...filters, [key]: value });
    };

  return (
    <div className="grid gap-3 rounded-[1.35rem] border border-white/70 bg-white/75 p-4 shadow-panel md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={filters.search}
          onChange={handle("search")}
          placeholder="Search services, components, versions"
          className="pl-11"
        />
      </label>
      <select
        value={filters.environment}
        onChange={handle("environment")}
        className="h-10 rounded-full border border-slate-200 bg-white/80 px-4 text-sm text-slate-700 shadow-sm"
      >
        <option value="all">All environments</option>
        {environments.map((environment) => (
          <option key={environment} value={environment}>
            {environment}
          </option>
        ))}
      </select>
      <select
        value={filters.platform}
        onChange={handle("platform")}
        className="h-10 rounded-full border border-slate-200 bg-white/80 px-4 text-sm text-slate-700 shadow-sm"
      >
        <option value="all">All platforms</option>
        {platforms.map((platform) => (
          <option key={platform} value={platform}>
            {platform}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={handle("status")}
        className="h-10 rounded-full border border-slate-200 bg-white/80 px-4 text-sm text-slate-700 shadow-sm"
      >
        <option value="all">All statuses</option>
        <option value="HEALTHY">Healthy</option>
        <option value="DEGRADED">Degraded</option>
        <option value="DOWN">Down</option>
      </select>
      <Button
        type="button"
        variant={filters.problematicOnly ? "default" : "secondary"}
        onClick={() => onChange({ ...filters, problematicOnly: !filters.problematicOnly })}
        className="gap-2"
      >
        <ShieldAlert className="h-4 w-4" />
        Problematic only
      </Button>
    </div>
  );
}
