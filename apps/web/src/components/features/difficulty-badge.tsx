import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_META } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

/** Difficulty pill with a leading dot, colored by the shared difficulty meta. */
export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const meta = DIFFICULTY_META[difficulty];

  return (
    <Badge variant={meta.badgeVariant} className={cn("gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}
