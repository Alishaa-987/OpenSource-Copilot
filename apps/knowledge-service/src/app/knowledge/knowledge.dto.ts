import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class RetrieveKnowledgeDto {
  @IsString() @MinLength(3) @MaxLength(2_000) question!: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) limit?: number;
}
