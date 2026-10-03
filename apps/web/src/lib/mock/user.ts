import type { GitHubUser, UserSkillProfile } from "@/lib/types";

/**
 * MOCK DATA — not real user data.
 *
 * Everything in `src/lib/mock/` is illustrative content for building and
 * demonstrating the UI. It is deliberately isolated behind the accessors in
 * `./index.ts` so it can be replaced by TanStack Query calls to the real API
 * without touching components. Do NOT present these figures as real analytics.
 */

export const mockCurrentUser: GitHubUser = {
  login: "devexplorer",
  name: "Alex Rivera",
  avatarUrl: null,
};

/** The signed-in developer's declared skills — drives recommendation matching. */
export const mockSkillProfile: UserSkillProfile = {
  languages: ["TypeScript", "JavaScript", "Python"],
  interests: ["developer-tools", "cli", "documentation", "web"],
  preferredDifficulty: "beginner",
};
