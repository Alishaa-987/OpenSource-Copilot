import { SkillGapService } from './skill-gap.service';
import type { ParsedResume, SkillGapIssueContext, SkillGapResult } from './resume-intelligence.types';

const profile = {
  githubUserId: '123',
  fileName: 'resume.pdf',
  fileType: 'pdf' as const,
  summary: 'Backend-leaning developer.',
  skills: ['REST APIs'] as ParsedResume['skills'],
  programmingLanguages: ['TypeScript'] as ParsedResume['programmingLanguages'],
  frameworksTools: ['NestJS'] as ParsedResume['frameworksTools'],
  projects: [] as ParsedResume['projects'],
  experience: [] as ParsedResume['experience'],
  education: [] as ParsedResume['education'],
  parsedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const issueContext: SkillGapIssueContext = {
  title: 'Fix pagination bug', labels: ['bug'], explanation: 'Page 2 is empty', rootCause: 'Off-by-one offset',
  requiredKnowledge: ['pagination'], dependencies: [], relevantFiles: ['src/pagination.ts'], complexity: 'low', effort: 'small',
};

const result: SkillGapResult = {
  readinessSummary: 'You can likely handle this with a quick read of pagination.ts.',
  matchedSkills: ['REST APIs'], missingSkills: [], partialSkills: [], relevantExperience: [],
  thingsToUnderstand: ['pagination offset math'], actionChecklist: ['Read pagination.ts'],
};

describe('SkillGapService', () => {
  it('calls the LLM and caches the result on a cache miss', async () => {
    const resumes = { requireProfile: jest.fn().mockResolvedValue(profile) };
    const llm = { assessSkillGap: jest.fn().mockResolvedValue(result) };
    const prisma = { skillGapAssessment: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}) } };
    const service = new SkillGapService(prisma as never, llm as never, resumes as never);

    const output = await service.assess('123', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', issueContext);

    expect(output).toEqual(result);
    expect(llm.assessSkillGap).toHaveBeenCalledTimes(1);
    expect(prisma.skillGapAssessment.upsert).toHaveBeenCalledTimes(1);
  });

  it('reuses a cached result and skips the LLM call when the resume and issue context are unchanged', async () => {
    const resumes = { requireProfile: jest.fn().mockResolvedValue(profile) };
    const llm = { assessSkillGap: jest.fn().mockResolvedValue(result) };
    const prisma = { skillGapAssessment: { findUnique: jest.fn(), upsert: jest.fn() } };
    const service = new SkillGapService(prisma as never, llm as never, resumes as never);

    // Prime the cache with the hash the service would compute for this exact (resume, issueContext) pair.
    const contextHash = (service as unknown as { hash(a: string, b: SkillGapIssueContext): string }).hash(profile.updatedAt, issueContext);
    prisma.skillGapAssessment.findUnique.mockResolvedValue({ contextHash, resultJson: result });

    const output = await service.assess('123', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', issueContext);

    expect(output).toEqual(result);
    expect(llm.assessSkillGap).not.toHaveBeenCalled();
    expect(prisma.skillGapAssessment.upsert).not.toHaveBeenCalled();
  });

  it('recomputes when the issue context changes even if a cache row exists', async () => {
    const resumes = { requireProfile: jest.fn().mockResolvedValue(profile) };
    const llm = { assessSkillGap: jest.fn().mockResolvedValue(result) };
    const prisma = { skillGapAssessment: { findUnique: jest.fn().mockResolvedValue({ contextHash: 'stale-hash', resultJson: result }), upsert: jest.fn().mockResolvedValue({}) } };
    const service = new SkillGapService(prisma as never, llm as never, resumes as never);

    await service.assess('123', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', issueContext);

    expect(llm.assessSkillGap).toHaveBeenCalledTimes(1);
  });
});
