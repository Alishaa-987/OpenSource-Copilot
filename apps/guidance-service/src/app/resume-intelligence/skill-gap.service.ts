import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Prisma } from '../../../../../libs/guidance-database/generated';
import { GuidancePrismaService } from '../database/guidance-prisma.service';
import { GuidanceLlmService } from '../contributor-intelligence/guidance-llm.service';
import { ResumeProfileService } from './resume-profile.service';
import type { ParsedResume, SkillGapIssueContext, SkillGapResult } from './resume-intelligence.types';

@Injectable()
export class SkillGapService {
  constructor(
    private readonly prisma: GuidancePrismaService,
    private readonly llm: GuidanceLlmService,
    private readonly resumes: ResumeProfileService,
  ) {}

  /**
   * Compares the caller's stored resume against one issue's already-computed
   * analysis. Neither RAG retrieval nor the issue-analysis LLM call happen
   * here - `issueContext` is compact JSON the frontend already assembled
   * from the issue intelligence it fetched separately, so this only spends
   * one (cacheable) LLM call: the resume-vs-issue comparison itself.
   */
  async assess(githubUserId: string, repositoryId: string, issueId: string, issueContext: SkillGapIssueContext): Promise<SkillGapResult> {
    const profile = await this.resumes.requireProfile(githubUserId);
    const contextHash = this.hash(profile.updatedAt, issueContext);
    const cached = await this.prisma.skillGapAssessment.findUnique({ where: { githubUserId_repositoryId_issueId: { githubUserId, repositoryId, issueId } } });
    if (cached && cached.contextHash === contextHash) return cached.resultJson as unknown as SkillGapResult;

    const resume: ParsedResume = {
      summary: profile.summary,
      skills: profile.skills,
      programmingLanguages: profile.programmingLanguages,
      frameworksTools: profile.frameworksTools,
      projects: profile.projects,
      experience: profile.experience,
      education: profile.education,
    };
    const result = await this.llm.assessSkillGap(resume, issueContext);
    await this.prisma.skillGapAssessment.upsert({
      where: { githubUserId_repositoryId_issueId: { githubUserId, repositoryId, issueId } },
      update: { contextHash, resultJson: this.toJson(result), generatedAt: new Date() },
      create: { githubUserId, repositoryId, issueId, contextHash, resultJson: this.toJson(result) },
    });
    return result;
  }

  private hash(resumeUpdatedAt: string, issueContext: SkillGapIssueContext): string {
    return createHash('sha1').update(resumeUpdatedAt).update(JSON.stringify(issueContext)).digest('hex');
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
