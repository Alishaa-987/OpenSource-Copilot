import { ShieldCheck } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Small, honest indicator that Phase 1 guidance is deterministic and rule-based
 * (no AI model in the loop). Sets expectations rather than implying magic.
 */
export function PhaseBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/60 px-3 py-2 text-xs text-sidebar-muted">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">Rule-based guidance</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          Recommendations use transparent, deterministic rules — no AI model.
          Explanations show exactly why each issue is suggested.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
