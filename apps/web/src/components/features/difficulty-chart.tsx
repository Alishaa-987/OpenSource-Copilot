"use client";

import { useTheme } from "next-themes";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { DIFFICULTY_META, DIFFICULTY_ORDER } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

/**
 * Distribution of recommended issues by difficulty. Recharts applies `fill` as
 * an SVG attribute, where `var(--token)` doesn't resolve — so we hand Recharts
 * concrete hexes chosen by the resolved theme. These MUST mirror the --success
 * / --warning / --danger tokens in globals.css (light + dark). Recomputed on
 * every render, so a theme flip repaints the donut with no effect or state.
 */
const PALETTE: Record<"light" | "dark", Record<Difficulty, string>> = {
  light: { beginner: "#16a34a", intermediate: "#d97706", advanced: "#dc2626" },
  dark: { beginner: "#22c55e", intermediate: "#f59e0b", advanced: "#ef4444" },
};

export function DifficultyChart({
  data,
}: {
  data: Record<Difficulty, number>;
}) {
  const { resolvedTheme } = useTheme();
  const colors = PALETTE[resolvedTheme === "dark" ? "dark" : "light"];
  const total = DIFFICULTY_ORDER.reduce((sum, d) => sum + data[d], 0);
  const slices = DIFFICULTY_ORDER.filter((d) => data[d] > 0).map((d) => ({
    key: d,
    label: DIFFICULTY_META[d].label,
    value: data[d],
    color: colors[d],
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-42 w-42 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={slices.length > 1 ? 2 : 0}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {total}
          </span>
          <span className="text-xs text-muted-foreground">issues</span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-2.5">
        {DIFFICULTY_ORDER.map((d) => {
          const value = data[d];
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <li key={d} className="flex items-center gap-3">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  DIFFICULTY_META[d].dotClass,
                )}
              />
              <span className="text-sm text-foreground">
                {DIFFICULTY_META[d].label}
              </span>
              <span className="ml-auto text-sm font-medium tabular-nums text-foreground">
                {value}
              </span>
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
