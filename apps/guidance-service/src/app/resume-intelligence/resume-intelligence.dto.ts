import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SkillGapRequestDto {
  /**
   * Compact JSON built client-side from the issue intelligence the workspace
   * page has already fetched (title, labels, explanation, rootCause,
   * requiredKnowledge, dependencies, relevant file paths, complexity,
   * effort). Bounded so a request can't be used to smuggle an oversized
   * payload into the LLM call.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(6_000)
  issueContext!: string;
}
