import { z } from 'zod';

// Structured resume profile extracted by the LLM from raw resume text. Kept
// deliberately compact (short strings, capped array lengths) so it stays
// cheap to store and cheap to resend as context for skill-gap comparisons -
// this is the "structured data" that lets us avoid re-sending the whole
// resume to the LLM on every comparison.
export const parsedResumeSchema = z.object({
  summary: z.string().max(600).default(''),
  skills: z.array(z.string().min(1).max(80)).max(40).default([]),
  programmingLanguages: z.array(z.string().min(1).max(60)).max(20).default([]),
  frameworksTools: z.array(z.string().min(1).max(80)).max(30).default([]),
  projects: z.array(z.object({
    name: z.string().min(1).max(150),
    description: z.string().max(400).default(''),
    technologies: z.array(z.string().min(1).max(60)).max(15).default([]),
  })).max(10).default([]),
  experience: z.array(z.object({
    role: z.string().min(1).max(150),
    organization: z.string().max(150).default(''),
    duration: z.string().max(80).default(''),
    highlights: z.array(z.string().min(1).max(300)).max(6).default([]),
  })).max(10).default([]),
  education: z.array(z.object({
    credential: z.string().min(1).max(200),
    institution: z.string().max(200).default(''),
    year: z.string().max(40).optional(),
  })).max(6).default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

export interface ResumeProfileRecord extends ParsedResume {
  readonly githubUserId: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly parsedAt: string;
  readonly updatedAt: string;
}

// The issue-side context the frontend sends for a skill-gap comparison. It
// is assembled client-side from data the issue workspace has already
// fetched (issue intelligence), so this service never re-runs RAG
// retrieval or the issue-analysis LLM call itself - it only compares the
// already-computed analysis against the already-stored resume. Parsed with
// zod (not just trusted as `unknown`) since it arrives as client-supplied
// JSON and feeds directly into an LLM prompt - every field is bounded and
// defaulted so malformed input degrades gracefully instead of throwing.
const boundedText = (maxChars: number) => z.string().default('').transform((value) => value.slice(0, maxChars));
const boundedList = (maxItemChars: number, maxItems: number) => z.array(z.string().transform((value) => value.slice(0, maxItemChars))).default([]).transform((values) => values.slice(0, maxItems));

export const skillGapIssueContextSchema = z.object({
  title: boundedText(300),
  labels: boundedList(80, 20),
  explanation: boundedText(2_000),
  rootCause: boundedText(2_000),
  requiredKnowledge: boundedList(200, 15),
  dependencies: boundedList(200, 15),
  relevantFiles: boundedList(300, 15),
  complexity: boundedText(40).transform((value) => value || 'unknown'),
  effort: boundedText(40).transform((value) => value || 'unknown'),
}).passthrough();

export type SkillGapIssueContext = z.infer<typeof skillGapIssueContextSchema>;

export const skillGapResultSchema = z.object({
  readinessSummary: z.string().max(600).default(''),
  matchedSkills: z.array(z.string().min(1).max(120)).max(15).default([]),
  missingSkills: z.array(z.string().min(1).max(120)).max(15).default([]),
  partialSkills: z.array(z.object({
    skill: z.string().min(1).max(120),
    note: z.string().max(300).default(''),
  })).max(10).default([]),
  relevantExperience: z.array(z.string().min(1).max(300)).max(8).default([]),
  thingsToUnderstand: z.array(z.string().min(1).max(300)).max(10).default([]),
  actionChecklist: z.array(z.string().min(1).max(300)).max(10).default([]),
});

export type SkillGapResult = z.infer<typeof skillGapResultSchema>;
