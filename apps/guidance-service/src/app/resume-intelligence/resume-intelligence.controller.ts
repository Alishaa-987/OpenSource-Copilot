import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUserClient } from './current-user.client';
import { ResumeProfileService } from './resume-profile.service';
import { SkillGapService } from './skill-gap.service';
import { SkillGapRequestDto } from './resume-intelligence.dto';
import { skillGapIssueContextSchema } from './resume-intelligence.types';

const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;

@Controller('v1/profile')
export class ResumeProfileController {
  constructor(
    private readonly currentUser: CurrentUserClient,
    private readonly resumes: ResumeProfileService,
  ) {}

  @Get('resume')
  async getResume(@Req() request: Request) {
    const user = await this.requireUser(request);
    const profile = await this.resumes.getProfile(user.githubUserId);
    return { profile };
  }

  @Post('resume')
  @UseInterceptors(FileInterceptor('resume', { limits: { fileSize: MAX_RESUME_FILE_BYTES, files: 1 } }))
  async uploadResume(@Req() request: Request, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.requireUser(request);
    if (!file) throw new BadRequestException('No resume file was uploaded');
    const profile = await this.resumes.uploadAndParse(user.githubUserId, file);
    return { profile };
  }

  @Delete('resume')
  async deleteResume(@Req() request: Request) {
    const user = await this.requireUser(request);
    await this.resumes.deleteProfile(user.githubUserId);
    return { deleted: true };
  }

  private async requireUser(request: Request) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    return this.currentUser.getCurrentUser(cookie);
  }
}

@Controller('v1/repositories')
export class SkillGapController {
  constructor(
    private readonly currentUser: CurrentUserClient,
    private readonly skillGap: SkillGapService,
  ) {}

  @Post(':repositoryId/issues/:issueId/skill-gap')
  async assess(
    @Req() request: Request,
    @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string,
    @Param('issueId', new ParseUUIDPipe()) issueId: string,
    @Body() body: SkillGapRequestDto,
  ) {
    const cookie = request.headers.cookie;
    if (!cookie) throw new UnauthorizedException('Authentication required');
    const user = await this.currentUser.getCurrentUser(cookie);
    let rawContext: unknown;
    try {
      rawContext = JSON.parse(body.issueContext);
    } catch {
      throw new BadRequestException('issueContext must be valid JSON');
    }
    const issueContext = skillGapIssueContextSchema.parse(rawContext);
    const result = await this.skillGap.assess(user.githubUserId, repositoryId, issueId, issueContext);
    return { repositoryId, issueId, result };
  }
}
