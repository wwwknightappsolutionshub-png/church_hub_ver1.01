import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { DevotionalMeetupRecurrence } from '@prisma/client';

export class CreateMeetupDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  groupId!: string;

  @IsString()
  startsAt!: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  onlineLink?: string;

  @IsOptional()
  @IsEnum(['PHYSICAL', 'ONLINE', 'HYBRID'])
  locationType?: 'PHYSICAL' | 'ONLINE' | 'HYBRID';

  @IsOptional()
  @IsEnum(DevotionalMeetupRecurrence)
  recurrence?: DevotionalMeetupRecurrence;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  reminderOffsetsMinutes?: number[];
}

export class UpdateMeetupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsUrl()
  onlineLink?: string;

  @IsOptional()
  @IsEnum(['PHYSICAL', 'ONLINE', 'HYBRID'])
  locationType?: 'PHYSICAL' | 'ONLINE' | 'HYBRID';

  @IsOptional()
  @IsEnum(DevotionalMeetupRecurrence)
  recurrence?: DevotionalMeetupRecurrence;
}

export class MeetupRsvpDto {
  @IsEnum(['ACCEPTED', 'DECLINED'])
  status!: 'ACCEPTED' | 'DECLINED';
}

export class MeetupReminderOffsetsDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10080, { each: true })
  offsets!: number[];
}

export class MeetupPostEventDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  prayerPoints?: string;

  @IsOptional()
  @IsString()
  actionSteps?: string;

  @IsOptional()
  @IsString()
  progressNote?: string;
}
