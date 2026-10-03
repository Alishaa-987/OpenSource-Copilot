import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A single metric cell. Deliberately flat — meant to sit inside a shared
 * bordered/divided container so the summary row reads as one instrument panel
 * rather than a scatter of floating cards.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-subtle-foreground" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
