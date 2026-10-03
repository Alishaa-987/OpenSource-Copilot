import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, FolderGit2, UserRound } from "lucide-react";

export const siteConfig = {
  name: "OpenPath",
  shortName: "OpenPath",
  description:
    "Understand any open-source repository and find the right issue to start contributing.",
  tagline: "A clearer path into open source.",
  /** Phase 1 runs deterministic, rule-based guidance — no AI model in the loop. */
  phase: 1,
} as const;

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Short description used in tooltips / command palette later. */
  description: string;
};

/**
 * Primary navigation — Phase 1 surface only.
 * Deferred to later phases (intentionally absent): My Progress, Bookmarks.
 */
export const primaryNav: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Your contribution journey at a glance",
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: FolderGit2,
    description: "Browse and analyze accessible repositories",
  },
  {
    title: "Profile",
    href: "/profile",
    icon: UserRound,
    description: "Your contributions, skills and progress",
  },
];
