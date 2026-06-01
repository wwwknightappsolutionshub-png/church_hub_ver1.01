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
import {
  DevotionalReminderChannel,
  DevotionalReminderFrequency,
} from '@prisma/client';

export class ReminderChannelSettingDto {
  @IsEnum(DevotionalReminderChannel)
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
  @IsEnum(DevotionalReminderFrequency)
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
