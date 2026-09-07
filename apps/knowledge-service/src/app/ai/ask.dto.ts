import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

class AskHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  content!: string;
}

export class AskQuestionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2_000)
  question!: string;

  /** Structured issue/repository context supplied by the issue workspace. */
  @IsOptional()
  @IsString()
  @MaxLength(60_000)
  context?: string;

  /** Recent user/assistant turns, limited to prevent unbounded prompt growth. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AskHistoryMessageDto)
  history?: AskHistoryMessageDto[];
}

export type AskHistoryMessage = AskHistoryMessageDto;

