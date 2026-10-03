import { languageColor } from "@/lib/display";
import { cn } from "@/lib/utils";

/** A language indicator: GitHub-style colored dot + name. */
export function LanguageBadge({
  language,
  className,
}: {
  language: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span
        className="size-2.5 rounded-full ring-1 ring-inset ring-black/5"
        style={{ backgroundColor: languageColor(language) }}
      />
      {language}
    </span>
  );
}
