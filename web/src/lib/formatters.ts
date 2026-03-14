export function formatLatency(value?: number | null) {
  if (value == null) return "n/a";
  return `${Math.round(value)} ms`;
}

export function formatDate(value?: string | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatStatus(status?: string | null) {
  if (!status) return "Unknown";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
