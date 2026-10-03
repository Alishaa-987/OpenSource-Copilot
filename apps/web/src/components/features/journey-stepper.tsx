import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type JourneyStatus = "complete" | "current" | "upcoming";

export interface JourneyDisplayStep {
  id: string;
  title: string;
  icon: LucideIcon;
  status: JourneyStatus;
  /** Optional caption, e.g. "You're here" or "Phase 2". */
  caption?: string;
}

function nodeClasses(status: JourneyStatus): string {
  switch (status) {
    case "complete":
      return "border-primary bg-primary text-primary-foreground";
    case "current":
      return "border-primary bg-surface text-primary ring-4 ring-primary/15";
    case "upcoming":
      return "border-dashed border-border bg-muted text-subtle-foreground";
  }
}

function labelClasses(status: JourneyStatus): string {
  return status === "upcoming"
    ? "text-muted-foreground"
    : "text-foreground";
}

function StepNode({ step }: { step: JourneyDisplayStep }) {
  const Icon = step.icon;
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
        nodeClasses(step.status),
      )}
    >
      {step.status === "complete" ? (
        <Check className="size-5" strokeWidth={2.5} />
      ) : (
        <Icon className="size-[18px]" />
      )}
    </span>
  );
}

function caption(step: JourneyDisplayStep) {
  if (!step.caption) return null;
  return (
    <span
      className={cn(
        "text-xs",
        step.status === "current" ? "font-medium text-primary" : "text-subtle-foreground",
      )}
    >
      {step.caption}
    </span>
  );
}

/**
 * Contribution journey. Renders a horizontal rail on `md+` and a vertical
 * timeline on mobile. The connecting line fills green up to the last completed
 * step, so progress reads at a glance.
 */
export function JourneyStepper({ steps }: { steps: JourneyDisplayStep[] }) {
  return (
    <>
      {/* Desktop: horizontal rail */}
      <ol className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, i) => {
          const prevComplete = i > 0 && steps[i - 1].status === "complete";
          const thisComplete = step.status === "complete";
          return (
            <li key={step.id} className="flex flex-col items-center gap-3 text-center">
              <div className="relative flex h-10 w-full items-center justify-center">
                {i > 0 && (
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2",
                      prevComplete ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      "absolute right-0 top-1/2 h-0.5 w-1/2 -translate-y-1/2",
                      thisComplete ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <StepNode step={step} />
              </div>
              <div className="flex flex-col gap-0.5 px-1">
                <span className={cn("text-sm font-medium leading-tight", labelClasses(step.status))}>
                  {step.title}
                </span>
                {caption(step)}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical timeline */}
      <ol className="flex flex-col md:hidden">
        {steps.map((step, i) => {
          const thisComplete = step.status === "complete";
          const isLast = i === steps.length - 1;
          return (
            <li key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <StepNode step={step} />
                {!isLast && (
                  <span
                    className={cn(
                      "my-1 w-0.5 flex-1",
                      thisComplete ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className={cn("flex flex-col gap-0.5 pt-2", isLast ? "" : "pb-4")}>
                <span className={cn("text-sm font-medium leading-tight", labelClasses(step.status))}>
                  {step.title}
                </span>
                {caption(step)}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
