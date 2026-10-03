import type { JourneyStep } from "@/lib/types";

/** MOCK DATA — see ./user.ts for the disclaimer. */

/**
 * The guided contribution journey. Phase 1 makes steps 1–7 real; later steps
 * are shown as "coming soon" so the path is legible end to end without
 * pretending future-phase features exist yet (PROJECT_BIBLE §74).
 */
export const journeySteps: JourneyStep[] = [
  {
    id: "step-connect",
    title: "Connect GitHub",
    description: "Sign in so we can see the repositories you can access.",
    phase: 1,
    available: true,
  },
  {
    id: "step-choose",
    title: "Choose a repository",
    description: "Browse accessible repos and pick one to explore.",
    phase: 1,
    available: true,
  },
  {
    id: "step-analyze",
    title: "Analyze the codebase",
    description:
      "We inspect languages, structure, and project health — no code is executed.",
    phase: 1,
    available: true,
  },
  {
    id: "step-understand",
    title: "Understand the repository",
    description: "Read a plain-language overview and the health signals.",
    phase: 1,
    available: true,
  },
  {
    id: "step-rules",
    title: "Review contribution rules",
    description: "See how the project expects contributions to be made.",
    phase: 1,
    available: true,
  },
  {
    id: "step-issues",
    title: "Explore recommended issues",
    description: "Get issues ranked for you by transparent, rule-based scoring.",
    phase: 1,
    available: true,
  },
  {
    id: "step-issue",
    title: "Understand an issue",
    description: "Break an issue down into what it asks and why it fits you.",
    phase: 1,
    available: true,
  },
  {
    id: "step-code",
    title: "Find the relevant code",
    description: "Jump to the files an issue most likely touches.",
    phase: 2,
    available: false,
  },
  {
    id: "step-pr",
    title: "Open a pull request",
    description: "Get guided help turning your change into a contribution.",
    phase: 5,
    available: false,
  },
];
