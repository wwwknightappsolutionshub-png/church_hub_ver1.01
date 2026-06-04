import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { DevotionalAudience } from '@prisma/client';

const DEVOTIONAL_AUDIENCE_VALUES = ['ALL', 'YOUTH', 'ADULT', 'FAMILY', 'LEADERS'] as const;

export class DevotionalPlanDayInputDto {
  @IsOptional()
  dayNumber?: number;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  scriptureRef?: string;

  @IsOptional()
  @IsString()
  scriptureText?: string;

  @IsOptional()
  @IsString()
  reflection?: string;

  @IsOptional()
  @IsString()
  prayerPrompt?: string;

  @IsOptional()
  @IsString()
  actionPoint?: string;
}

export class CreateDevotionalPlanDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(DEVOTIONAL_AUDIENCE_VALUES)
  audience?: DevotionalAudience;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevotionalPlanDayInputDto)
  days?: DevotionalPlanDayInputDto[];

  /** Legacy JSON entries — synced into DevotionalPlanDay rows when provided */
  @IsOptional()
  @IsArray()
  entries?: Array<{
    day?: number;
    title?: string;
    scripture?: string;
    reflection?: string;
    prayerPrompt?: string;
    actionPoint?: string;
  }>;
}
