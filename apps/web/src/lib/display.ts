import type { Difficulty } from "@/lib/types";

/**
 * Presentation helpers shared across pages so difficulty, score, and language
 * styling stay consistent everywhere. Pure and client-safe.
 *
 * Chart colors are returned as CSS custom-property references so Recharts SVG
 * fills stay theme-aware and update live on light/dark toggle.
 */

type BadgeVariant = "success" | "warning" | "danger";

export const DIFFICULTY_META: Record<
  Difficulty,
  {
    label: string;
    badgeVariant: BadgeVariant;
    /** CSS var reference for charts and custom fills. */
    chartColor: string;
    /** Tailwind classes for a small solid dot. */
    dotClass: string;
  }
> = {
  beginner: {
    label: "Beginner",
    badgeVariant: "success",
    chartColor: "var(--color-success)",
    dotClass: "bg-success",
  },
  intermediate: {
    label: "Intermediate",
    badgeVariant: "warning",
    chartColor: "var(--color-warning)",
    dotClass: "bg-warning",
  },
  advanced: {
    label: "Advanced",
    badgeVariant: "danger",
    chartColor: "var(--color-danger)",
    dotClass: "bg-danger",
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

/** Color + copy for a recommendation score tier. */
export function scoreTierMeta(score: number): {
  tier: "excellent" | "strong" | "fair";
  label: string;
  /** Text/track color classes for the score meter. */
  textClass: string;
  trackClass: string;
} {
  if (score >= 70) {
    return {
      tier: "excellent",
      label: "Excellent match",
      textClass: "text-success",
      trackClass: "bg-success",
    };
  }
  if (score >= 45) {
    return {
      tier: "strong",
      label: "Strong match",
      textClass: "text-info",
      trackClass: "bg-info",
    };
  }
  return {
    tier: "fair",
    label: "Fair match",
    textClass: "text-muted-foreground",
    trackClass: "bg-subtle-foreground",
  };
}

/** GitHub-style language colors, with a neutral fallback. */
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "#3178c6",
  javascript: "#f1e05a",
  python: "#3572a5",
  rust: "#dea584",
  go: "#00add8",
  vue: "#41b883",
  scss: "#c6538c",
  css: "#563d7c",
  mdx: "#fcb32c",
  "c++": "#f34b7d",
  shell: "#89e051",
  dockerfile: "#384d54",
};

export function languageColor(name: string): string {
  return LANGUAGE_COLORS[name.toLowerCase()] ?? "#94a3b8";
}
