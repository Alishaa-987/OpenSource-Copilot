/** MOCK DATA — see ./user.ts for the disclaimer. */

export interface ContributionRule {
  /** Stable key so the UI can pick an icon. */
  kind:
    | "fork-branch"
    | "commit-style"
    | "tests-required"
    | "sign-cla"
    | "issue-first"
    | "code-style"
    | "review"
    | "docs";
  title: string;
  detail: string;
  /** How strongly the project enforces this, for badge tone. */
  severity: "required" | "recommended";
}

export interface RepositoryGuidance {
  /** Short plain-language summary of the contribution flow. */
  summary: string;
  rules: ContributionRule[];
  /** Whether an official CONTRIBUTING guide exists to link out to. */
  contributingUrl: string | null;
  codeOfConductUrl: string | null;
}

/** Keyed by repository id. */
export const repositoryGuidance: Record<string, RepositoryGuidance> = {
  "repo-inkline": {
    summary:
      "Inkline welcomes first-time contributors. Claim an issue by commenting, work on a branch off `main`, and open a pull request with tests. Maintainers review within a couple of days.",
    contributingUrl: "https://github.com/inkline/inkline/blob/main/CONTRIBUTING.md",
    codeOfConductUrl:
      "https://github.com/inkline/inkline/blob/main/CODE_OF_CONDUCT.md",
    rules: [
      {
        kind: "issue-first",
        title: "Comment on an issue before starting",
        detail:
          "Let maintainers assign it to you so two people don't work on the same thing.",
        severity: "recommended",
      },
      {
        kind: "fork-branch",
        title: "Branch from `main`",
        detail: "Fork the repo and create a feature branch named `fix/…` or `feat/…`.",
        severity: "required",
      },
      {
        kind: "commit-style",
        title: "Use Conventional Commits",
        detail: "Prefix commits with `fix:`, `feat:`, `docs:`, etc.",
        severity: "required",
      },
      {
        kind: "tests-required",
        title: "Add or update tests",
        detail: "New behavior needs coverage; run `pnpm test` before pushing.",
        severity: "required",
      },
      {
        kind: "code-style",
        title: "Run the formatter",
        detail: "`pnpm lint --fix` keeps the diff clean and CI green.",
        severity: "recommended",
      },
    ],
  },
  "repo-quill-cli": {
    summary:
      "Quill CLI is friendly to Python newcomers. Open or claim an issue, keep pull requests small, and include a test. There's no CLA.",
    contributingUrl:
      "https://github.com/quill-labs/quill-cli/blob/main/CONTRIBUTING.md",
    codeOfConductUrl: null,
    rules: [
      {
        kind: "fork-branch",
        title: "Fork and branch",
        detail: "Create a branch per change; keep pull requests focused.",
        severity: "required",
      },
      {
        kind: "tests-required",
        title: "Include a test",
        detail: "Run `pytest` locally; CI must pass before review.",
        severity: "required",
      },
      {
        kind: "code-style",
        title: "Format with Ruff",
        detail: "`ruff format .` and `ruff check .` before committing.",
        severity: "recommended",
      },
      {
        kind: "review",
        title: "One maintainer approval",
        detail: "A single approving review is enough to merge.",
        severity: "required",
      },
    ],
  },
  "repo-cartographer": {
    summary:
      "Cartographer is a mature engine. Non-trivial changes should start with a design discussion on the issue. Expect a thorough review and slower response times.",
    contributingUrl:
      "https://github.com/mapstack/cartographer/blob/main/CONTRIBUTING.md",
    codeOfConductUrl:
      "https://github.com/mapstack/cartographer/blob/main/CODE_OF_CONDUCT.md",
    rules: [
      {
        kind: "issue-first",
        title: "Discuss before large changes",
        detail:
          "Architecture-level work needs maintainer buy-in on the issue first.",
        severity: "required",
      },
      {
        kind: "sign-cla",
        title: "Sign the CLA",
        detail: "A contributor license agreement is required before the first merge.",
        severity: "required",
      },
      {
        kind: "tests-required",
        title: "Benchmarks for performance work",
        detail: "Performance changes must include before/after benchmark numbers.",
        severity: "required",
      },
      {
        kind: "review",
        title: "Two maintainer approvals",
        detail: "Core changes require review from two maintainers.",
        severity: "required",
      },
    ],
  },
  "repo-lumen-docs": {
    summary:
      "Lumen Docs is one of the easiest places to make a first contribution. Edit MDX content, preview locally, and open a pull request — no tests required for content-only changes.",
    contributingUrl: "https://github.com/lumen/lumen-docs/blob/main/CONTRIBUTING.md",
    codeOfConductUrl:
      "https://github.com/lumen/lumen-docs/blob/main/CODE_OF_CONDUCT.md",
    rules: [
      {
        kind: "fork-branch",
        title: "Fork and edit",
        detail: "Branch from `main`; content lives under `content/`.",
        severity: "required",
      },
      {
        kind: "docs",
        title: "Preview your changes",
        detail: "Run `pnpm dev` and check the page renders before opening a PR.",
        severity: "recommended",
      },
      {
        kind: "commit-style",
        title: "Describe the change",
        detail: "A short, clear PR description helps reviewers merge faster.",
        severity: "recommended",
      },
    ],
  },
};
