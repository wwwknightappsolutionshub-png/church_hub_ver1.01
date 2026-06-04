import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { DevotionalPlanSourceType, DevotionalPlanTone } from '@prisma/client';
import { DEVOTIONAL_PLAN_SOURCE_TYPE, DEVOTIONAL_PLAN_TONE } from './prisma-enum-values';

export class StudyOutlineAiDto {
  @IsOptional()
  @IsEnum(DEVOTIONAL_PLAN_SOURCE_TYPE)
  sourceType?: DevotionalPlanSourceType;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  bibleBook?: string;

  @IsOptional()
  @IsString()
  topicalBook?: string;

  @IsOptional()
  @IsString()
  customTopic?: string;

  @IsOptional()
  @IsEnum(DEVOTIONAL_PLAN_TONE)
  tone?: DevotionalPlanTone;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  durationWeeks?: number;

  @IsOptional()
  @IsString()
  planId?: string;
}

export class PrayerPointsAiDto {
  @IsIn(['SCRIPTURE', 'TOPIC', 'PDF', 'DAILY_SECTION'])
  source!: 'SCRIPTURE' | 'TOPIC' | 'PDF' | 'DAILY_SECTION';

  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  dayId?: string;

  @IsOptional()
  @IsString()
  pdfImportId?: string;
}

export class AskScriptureAiDto {
  @IsString()
  @MinLength(3)
  question!: string;

  @IsOptional()
  @IsString()
  passage?: string;

  @IsOptional()
  @IsIn(['SIMPLE', 'YOUTH', 'ADULT_THEOLOGICAL'])
  depth?: 'SIMPLE' | 'YOUTH' | 'ADULT_THEOLOGICAL';

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  dayId?: string;
}

export class PdfSimplifyDto {
  @IsIn(['KIDS_8_12', 'TEENS', 'YOUTH', 'ADULTS', 'NEW_BELIEVER'])
  readingLevel!: 'KIDS_8_12' | 'TEENS' | 'YOUTH' | 'ADULTS' | 'NEW_BELIEVER';

  @IsOptional()
  @IsInt()
  @Min(1)
  pageNumber?: number;
}
