import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

/**
 * OpenPath mark: a compact route through connected points, representing a
 * clear path from an issue to a contribution.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 text-primary", className)}
    >
      <path
        d="M4.5 16 9.2 11.3l3.5 3.5L19.5 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="4.5" cy="16" r="2" fill="currentColor" />
      <circle cx="9.2" cy="11.3" r="2" className="fill-background" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19.5" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo className="size-5 shrink-0" />
      {showName && (
        <span className="text-[15px] font-medium leading-none tracking-[-0.025em] text-foreground">
          {siteConfig.name.slice(0, 4)}<span className="text-primary">{siteConfig.name.slice(4)}</span>
        </span>
      )}
    </span>
  );
}
