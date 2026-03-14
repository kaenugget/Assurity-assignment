import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WidgetFrame({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("relative flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <CardHeader className="grid-item-handle shrink-0 pb-3">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}
