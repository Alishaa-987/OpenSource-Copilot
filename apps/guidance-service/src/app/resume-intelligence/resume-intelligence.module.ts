import { Module } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import type { GuidanceEnv } from '../env';
import { GuidanceLlmService } from '../contributor-intelligence/guidance-llm.service';
import { ResumeProfileController, SkillGapController } from './resume-intelligence.controller';
import { ResumeProfileService } from './resume-profile.service';
import { SkillGapService } from './skill-gap.service';
import { ResumeTextExtractor } from './resume-text-extractor';
import { ResumeFallbackParser } from './resume-fallback-parser';
import { CurrentUserClient } from './current-user.client';

@Module({
  controllers: [ResumeProfileController, SkillGapController],
  providers: [
    { provide: CurrentUserClient, inject: [TypedConfigService], useFactory: (config: TypedConfigService<GuidanceEnv>) => new CurrentUserClient(config) },
    ResumeTextExtractor,
    // Keeps resume upload working when the AI step fails - see
    // ResumeProfileService.parseResumeText.
    ResumeFallbackParser,
    // Reuses the same Groq-backed LLM service the issue-intelligence
    // pipeline already uses, rather than standing up another AI client.
    GuidanceLlmService,
    ResumeProfileService,
    SkillGapService,
  ],
})
export class ResumeIntelligenceModule {}
