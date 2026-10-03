import type { Label } from "@/lib/types";

/** MOCK DATA — see ./user.ts for the disclaimer. */

/** Shared label catalog, keyed for reuse across issues. Colors are GitHub-style hex (no '#'). */
export const labels = {
  goodFirstIssue: {
    id: "lbl-gfi",
    name: "good first issue",
    color: "7057ff",
    description: "Good for newcomers",
  },
  helpWanted: {
    id: "lbl-help",
    name: "help wanted",
    color: "008672",
    description: "Extra attention is needed",
  },
  bug: {
    id: "lbl-bug",
    name: "bug",
    color: "d73a4a",
    description: "Something isn't working",
  },
  documentation: {
    id: "lbl-docs",
    name: "documentation",
    color: "0075ca",
    description: "Improvements or additions to documentation",
  },
  enhancement: {
    id: "lbl-enh",
    name: "enhancement",
    color: "a2eeef",
    description: "New feature or request",
  },
  testing: {
    id: "lbl-test",
    name: "testing",
    color: "bfd4f2",
    description: "Test coverage and reliability",
  },
  accessibility: {
    id: "lbl-a11y",
    name: "accessibility",
    color: "0e8a16",
    description: "Accessibility improvements",
  },
  performance: {
    id: "lbl-perf",
    name: "performance",
    color: "fbca04",
    description: "Performance-related work",
  },
  advanced: {
    id: "lbl-adv",
    name: "advanced",
    color: "b60205",
    description: "Requires deep familiarity with the codebase",
  },
  ui: {
    id: "lbl-ui",
    name: "ui",
    color: "c5def5",
    description: "User interface",
  },
} satisfies Record<string, Label>;

export type LabelKey = keyof typeof labels;
