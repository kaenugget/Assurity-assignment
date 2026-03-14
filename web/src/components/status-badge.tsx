import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const variant =
    status === "HEALTHY"
      ? "success"
      : status === "DEGRADED"
        ? "warning"
        : status === "DOWN"
          ? "danger"
          : "neutral";

  return (
    <Badge variant={variant} className={cn("justify-center", className)}>
      {status ?? "Unknown"}
    </Badge>
  );
}
