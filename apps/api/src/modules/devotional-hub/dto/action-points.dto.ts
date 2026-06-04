import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { DevotionalReminderChannel, DevotionalReminderFrequency } from '@prisma/client';
import { DEVOTIONAL_REMINDER_CHANNEL, DEVOTIONAL_REMINDER_FREQUENCY } from './prisma-enum-values';

export class CreateActionPointDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  dayId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  challengeId?: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  remindersEnabled?: boolean;

  @IsOptional()
  @IsEnum(DEVOTIONAL_REMINDER_FREQUENCY)
  reminderFrequency?: DevotionalReminderFrequency;

  @IsOptional()
  @IsArray()
  @IsEnum(DEVOTIONAL_REMINDER_CHANNEL, { each: true })
  reminderChannels?: DevotionalReminderChannel[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  reminderHourLocal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  reminderMinuteLocal?: number;

  @IsOptional()
  @IsString()
  reminderTimezone?: string;
}

export class UpdateActionPointDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  remindersEnabled?: boolean;

  @IsOptional()
  @IsEnum(DEVOTIONAL_REMINDER_FREQUENCY)
  reminderFrequency?: DevotionalReminderFrequency;

  @IsOptional()
  @IsArray()
  @IsEnum(DEVOTIONAL_REMINDER_CHANNEL, { each: true })
  reminderChannels?: DevotionalReminderChannel[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  reminderHourLocal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  reminderMinuteLocal?: number;

  @IsOptional()
  @IsString()
  reminderTimezone?: string;
}

