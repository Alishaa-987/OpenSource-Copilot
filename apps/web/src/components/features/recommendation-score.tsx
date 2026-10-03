import { scoreTierMeta } from "@/lib/display";
import { cn } from "@/lib/utils";

/**
 * Recommendation score shown as a small circular gauge. The score itself comes
 * from the deterministic engine; this only visualizes it. Ring and number are
 * colored by tier (excellent / strong / fair).
 */
export function RecommendationScore({
  score,
  size = 44,
  showLabel = false,
  className,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = scoreTierMeta(score);
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={cn("-rotate-90", meta.textClass)}
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
          />
        </svg>
        <span
          className={cn(
            "absolute font-semibold tabular-nums",
            meta.textClass,
          )}
          style={{ fontSize: size * 0.3 }}
        >
          {score}
        </span>
      </div>
      {showLabel && (
        <span className="flex flex-col leading-tight">
          <span className={cn("text-sm font-medium", meta.textClass)}>
            {meta.label}
          </span>
          <span className="text-xs text-muted-foreground">match score</span>
        </span>
      )}
      <span className="sr-only">
        Recommendation score {score} out of 100, {meta.label}
      </span>
    </div>
  );
}
