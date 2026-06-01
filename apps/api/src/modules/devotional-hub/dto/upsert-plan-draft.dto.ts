import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DevotionalAudience,
  DevotionalPlanSourceType,
  DevotionalPlanTone,
} from '@prisma/client';
import { DevotionalPlanDayInputDto } from './create-plan.dto';

export class UpsertDevotionalPlanDraftDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(DevotionalPlanSourceType)
  sourceType?: DevotionalPlanSourceType;

  @IsOptional()
  @IsString()
  sourceLabel?: string;

  @IsOptional()
  @IsString()
  topicalBook?: string;

  @IsOptional()
  @IsString()
  bibleBook?: string;

  @IsOptional()
  @IsString()
  customTopic?: string;

  @IsOptional()
  @IsEnum(DevotionalPlanTone)
  tone?: DevotionalPlanTone;

  @IsOptional()
  @IsEnum(DevotionalAudience)
  audience?: DevotionalAudience;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @IsOptional()
  @IsString()
  pdfImportId?: string;

  @IsOptional()
  @IsBoolean()
  generateOutline?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevotionalPlanDayInputDto)
  days?: DevotionalPlanDayInputDto[];
}
