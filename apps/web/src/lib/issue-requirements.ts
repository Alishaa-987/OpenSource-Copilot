import type { BackendContributorIntelligenceResult } from "./backend-types";

/**
 * Works out what an issue actually asks of an engineer, before any resume is
 * involved.
 *
 * The readiness view used to jump straight to "here are your matching skills",
 * which is backwards: a contributor first wants to know what the work IS.
 * Everything here is read off evidence the page already has - the file and
 * documentation paths the analysis grounded itself in, the issue labels, and
 * the declared required knowledge. No model is called and nothing is invented;
 * an area only appears when a real path or label matched it, and the matched
 * paths are shown as the reason.
 */

export type RequirementAreaKey =
  | "docs" | "styling" | "markup" | "frontend" | "backend" | "testing"
  | "config" | "ci" | "data" | "tooling";

export interface RequirementArea {
  key: RequirementAreaKey;
  label: string;
  /** What this means in engineering terms - the part a beginner needs spelled out. */
  meaning: string;
  /** The evidence that put this area on the list. */
  matched: string[];
}

interface Rule {
  key: RequirementAreaKey;
  label: string;
  meaning: string;
  test: RegExp;
}

const RULES: Rule[] = [
  { key: "docs", label: "Documentation", test: /\.(md|mdx|rst|txt)$|(^|\/)docs?(\/|$)|readme/i,
    meaning: "Writing for other developers: matching the existing file structure, headings, front-matter and the way examples are presented." },
  { key: "styling", label: "CSS / styling", test: /\.(css|scss|sass|less|styl)$|(^|\/)styles?(\/|$)/i,
    meaning: "Reading existing selectors, custom properties and modifier classes, and changing them without breaking anything that reuses them." },
  { key: "markup", label: "HTML / markup", test: /\.(html|htm|hbs|ejs|pug|njk)$/i,
    meaning: "Semantic structure and accessibility - element choice, ARIA attributes and keyboard behaviour, not just how it looks." },
  { key: "frontend", label: "Frontend code", test: /\.(jsx|tsx|vue|svelte)$|(^|\/)(components?|ui|pages?|app)(\/|$)/i,
    meaning: "Component structure, props and state, and where the rendering for this feature is wired up." },
  { key: "backend", label: "Backend code", test: /\.(py|rb|go|java|php|cs|rs)$|(^|\/)(server|api|services?|controllers?|models?|routes?)(\/|$)/i,
    meaning: "Server-side logic: where the request enters, what it touches, and which layer owns the behaviour being changed." },
  { key: "testing", label: "Tests", test: /(^|\/)(tests?|__tests__|spec|e2e|cypress)(\/|$)|\.(test|spec)\.[a-z]+$/i,
    meaning: "Running the existing suite, finding the test that covers this path, and adding one that fails before your change and passes after." },
  { key: "config", label: "Project configuration", test: /(package|tsconfig|composer|pyproject|cargo)\.(json|toml|cfg)$|\.(config)\.[a-z]+$|\.(eslintrc|prettierrc|editorconfig)/i,
    meaning: "How the project is built and linted, so a change does not fail on formatting or build rules." },
  { key: "ci", label: "CI / workflows", test: /(^|\/)\.github(\/|$)|\.(yml|yaml)$|(^|\/)(ci|pipelines?)(\/|$)/i,
    meaning: "What the automated checks run on every pull request, so you know what has to be green before review." },
  { key: "data", label: "Data / schema", test: /\.(sql|prisma|graphql|gql)$|(^|\/)(migrations?|schema|db)(\/|$)/i,
    meaning: "The shape of stored data and how a change to it has to be migrated rather than edited in place." },
  { key: "tooling", label: "Build tooling", test: /(webpack|vite|rollup|gulp|babel|dockerfile|makefile)/i,
    meaning: "How the project is compiled or bundled, and which command reproduces what CI does." },
];

/** Label keywords that signal an area even when no path matched it. */
const LABEL_HINTS: Array<{ key: RequirementAreaKey; test: RegExp }> = [
  { key: "docs", test: /doc|readme|writing|guide/i },
  { key: "styling", test: /css|style|scss|design|ui/i },
  { key: "markup", test: /html|a11y|accessib|aria/i },
  { key: "testing", test: /test|spec|coverage/i },
  { key: "ci", test: /ci|workflow|action|pipeline/i },
];

export interface IssueRequirements {
  areas: RequirementArea[];
  /** Named knowledge the analysis already declared for this issue. */
  knowledge: string[];
  dependencies: string[];
  scope: {
    complexity: string;
    effort: string;
    beginnerSuitable: boolean;
    touchedFiles: number;
  };
}

export function deriveIssueRequirements(data: BackendContributorIntelligenceResult): IssueRequirements {
  const paths = Array.from(new Set([
    ...data.mapping.relevantFiles.map((item) => item.path),
    ...data.mapping.relevantDocumentation.map((item) => item.path),
    ...data.mapping.relevantModules.map((item) => item.path),
    ...(Array.isArray(data.analysis.evidencePaths) ? data.analysis.evidencePaths : []),
  ].filter(Boolean)));

  const labels = data.issue.labels.map((label) => label.name);
  const areas = new Map<RequirementAreaKey, RequirementArea>();

  for (const rule of RULES) {
    const matched = paths.filter((path) => rule.test.test(path));
    if (matched.length === 0) continue;
    areas.set(rule.key, { key: rule.key, label: rule.label, meaning: rule.meaning, matched: matched.slice(0, 4) });
  }

  for (const hint of LABEL_HINTS) {
    if (areas.has(hint.key)) continue;
    const matched = labels.filter((label) => hint.test.test(label));
    if (matched.length === 0) continue;
    const rule = RULES.find((candidate) => candidate.key === hint.key);
    if (!rule) continue;
    areas.set(hint.key, { key: rule.key, label: rule.label, meaning: rule.meaning, matched: matched.map((label) => `label: ${label}`) });
  }

  return {
    areas: [...areas.values()],
    knowledge: data.analysis.requiredKnowledge ?? [],
    dependencies: data.analysis.dependencies ?? [],
    scope: {
      complexity: data.analysis.complexity,
      effort: data.analysis.effort,
      beginnerSuitable: data.analysis.beginnerSuitable,
      touchedFiles: paths.length,
    },
  };
}
