import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { RecommendationService } from './recommendation.service';

export class RecommendationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage = 20;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-100)
  @Max(100)
  minScore?: number;
}

@Controller('v1/repositories')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationService) {}

  @Get(':repositoryId/recommendations')
  getRecommendations(@Req() request: Request, @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Query() query: RecommendationsQueryDto) {
    return this.recommendations.getRecommendations(repositoryId, { page: query.page, perPage: query.perPage, label: query.label, minScore: query.minScore }, request.headers.cookie);
  }

  @Get(':repositoryId/first-contribution-recommendations')
  getFirstContributionRecommendations(@Req() request: Request, @Param('repositoryId', new ParseUUIDPipe()) repositoryId: string, @Query() query: RecommendationsQueryDto) {
    return this.recommendations.getFirstContributionRecommendations(repositoryId, { page: query.page, perPage: query.perPage, label: query.label, minScore: query.minScore }, request.headers.cookie);
  }
}
