import { Injectable, Logger, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Prisma } from '../../../../../libs/guidance-database/generated';
import { GuidancePrismaService } from '../database/guidance-prisma.service';
import { GuidanceLlmService } from '../contributor-intelligence/guidance-llm.service';
import { ResumeTextExtractor, type SupportedResumeFileType } from './resume-text-extractor';
import { ResumeFallbackParser } from './resume-fallback-parser';
import type { ParsedResume, ResumeProfileRecord } from './resume-intelligence.types';

@Injectable()
export class ResumeProfileService {
  private readonly logger = new Logger(ResumeProfileService.name);

  constructor(
    private readonly prisma: GuidancePrismaService,
    private readonly llm: GuidanceLlmService,
    private readonly extractor: ResumeTextExtractor,
    private readonly fallback: ResumeFallbackParser,
  ) {}

  /**
   * Parses an uploaded resume into structured profile data and stores it,
   * replacing any previous resume for this user. The raw text is used only
   * for this one LLM call and is never persisted - only the structured
   * result is stored, so re-viewing or re-comparing later never needs to
   * resend the resume itself.
   */
  async uploadAndParse(githubUserId: string, file: { originalname: string; mimetype: string; buffer: Buffer }): Promise<ResumeProfileRecord> {
    const fileType = this.extractor.detectFileType(file.originalname, file.mimetype);
    const text = await this.extractor.extractText(file.buffer, fileType);
    const parsed = await this.parseResumeText(text);
    const saved = await this.prisma.resumeProfile.upsert({
      where: { githubUserId },
      update: { fileName: file.originalname.slice(0, 255), fileType, ...this.toRow(parsed) },
      create: { githubUserId, fileName: file.originalname.slice(0, 255), fileType, ...this.toRow(parsed) },
    });
    // A new resume invalidates any previously cached skill-gap comparisons
    // for this user - they were computed against the old profile.
    await this.prisma.skillGapAssessment.deleteMany({ where: { githubUserId } });
    return this.toRecord(saved);
  }

  /**
   * The resume itself was already read successfully by the time this runs -
   * only the AI enrichment can still fail here (provider down, key rejected,
   * rate limit, malformed response). Failing the whole upload for that would
   * make an otherwise valid resume unusable, so a deterministic
   * keyword-based profile is stored instead. Uploading again once the AI is
   * healthy replaces it with the richer parse.
   */
  private async parseResumeText(text: string): Promise<ParsedResume> {
    try {
      return await this.llm.parseResume(text);
    } catch (error) {
      this.logger.warn(`AI resume parsing failed, storing a keyword-based profile instead: ${error instanceof Error ? error.message : 'unknown error'}`);
      return this.fallback.parse(text);
    }
  }

  async getProfile(githubUserId: string): Promise<ResumeProfileRecord | null> {
    const saved = await this.prisma.resumeProfile.findUnique({ where: { githubUserId } });
    return saved ? this.toRecord(saved) : null;
  }

  async requireProfile(githubUserId: string): Promise<ResumeProfileRecord> {
    const profile = await this.getProfile(githubUserId);
    if (!profile) throw new NotFoundException('No resume has been uploaded yet');
    return profile;
  }

  async deleteProfile(githubUserId: string): Promise<void> {
    await this.prisma.skillGapAssessment.deleteMany({ where: { githubUserId } });
    await this.prisma.resumeProfile.deleteMany({ where: { githubUserId } });
  }

  private toRow(parsed: ParsedResume) {
    return {
      summary: parsed.summary,
      skills: this.toJson(parsed.skills),
      programmingLanguages: this.toJson(parsed.programmingLanguages),
      frameworksTools: this.toJson(parsed.frameworksTools),
      projects: this.toJson(parsed.projects),
      experience: this.toJson(parsed.experience),
      education: this.toJson(parsed.education),
    };
  }

  private toRecord(saved: {
    githubUserId: string; fileName: string; fileType: string; summary: string;
    skills: Prisma.JsonValue; programmingLanguages: Prisma.JsonValue; frameworksTools: Prisma.JsonValue;
    projects: Prisma.JsonValue; experience: Prisma.JsonValue; education: Prisma.JsonValue;
    parsedAt: Date; updatedAt: Date;
  }): ResumeProfileRecord {
    return {
      githubUserId: saved.githubUserId,
      fileName: saved.fileName,
      fileType: saved.fileType as SupportedResumeFileType,
      summary: saved.summary,
      skills: (saved.skills as ParsedResume['skills']) ?? [],
      programmingLanguages: (saved.programmingLanguages as ParsedResume['programmingLanguages']) ?? [],
      frameworksTools: (saved.frameworksTools as ParsedResume['frameworksTools']) ?? [],
      projects: (saved.projects as ParsedResume['projects']) ?? [],
      experience: (saved.experience as ParsedResume['experience']) ?? [],
      education: (saved.education as ParsedResume['education']) ?? [],
      parsedAt: saved.parsedAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
