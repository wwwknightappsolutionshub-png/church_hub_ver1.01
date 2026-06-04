import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { DevotionalReminderChannel, DevotionalReminderFrequency } from '@prisma/client';
import { DEVOTIONAL_REMINDER_CHANNEL, DEVOTIONAL_REMINDER_FREQUENCY } from './prisma-enum-values';

export class ReminderChannelSettingDto {
  @IsEnum(DEVOTIONAL_REMINDER_CHANNEL)
  channel!: DevotionalReminderChannel;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hourLocal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minuteLocal?: number;
}

export class UpsertReminderPreferencesDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietStartHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietEndHour?: number;
}

export class UpsertPlanRemindersDto {
  @IsOptional()
  @IsEnum(DEVOTIONAL_REMINDER_FREQUENCY)
  frequency?: DevotionalReminderFrequency;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderChannelSettingDto)
  channels!: ReminderChannelSettingDto[];
}

export class SnoozeReminderDto {
  @IsInt()
  @Min(1)
  @Max(1440)
  minutes!: number;
}
