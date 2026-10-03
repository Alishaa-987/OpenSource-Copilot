import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number formatting: 1200 -> "1.2k", 3_400_000 -> "3.4M". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Relative time from an ISO timestamp, e.g. "3 days ago". Deterministic given `now`. */
export function formatRelativeTime(iso: string, now: Date = REFERENCE_NOW): string {
  const then = new Date(iso).getTime();
  const diffMs = then - now.getTime();
  const abs = Math.abs(diffMs);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "just now";
}

/**
 * Fixed reference "now" so relative timestamps in mock data render deterministically
 * (no hydration mismatch, no dependence on the real clock during development).
 */
export const REFERENCE_NOW = new Date("2026-08-11T12:00:00Z");
