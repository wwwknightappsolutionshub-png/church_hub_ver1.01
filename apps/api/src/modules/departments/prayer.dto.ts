import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum PrayerBurdenTypeDto {
  WEEKLY_BURDEN = 'WEEKLY_BURDEN',
  CHURCH_WIDE = 'CHURCH_WIDE',
  MEMBER_NEED = 'MEMBER_NEED',
}

export enum PrayerConfidentialityDto {
  PUBLIC = 'PUBLIC',
  LEADERS_ONLY = 'LEADERS_ONLY',
  PASTORS_ONLY = 'PASTORS_ONLY',
  INTERCESSORS_ONLY = 'INTERCESSORS_ONLY',
}

export enum PrayerIntakeCategoryDto {
  URGENT = 'URGENT',
  HEALING = 'HEALING',
  FAMILY = 'FAMILY',
  FINANCIAL = 'FINANCIAL',
  SALVATION = 'SALVATION',
  THANKSGIVING = 'THANKSGIVING',
  OTHER = 'OTHER',
}

export enum PrayerScheduleTypeDto {
  MIDNIGHT_CHAIN = 'MIDNIGHT_CHAIN',
  DAILY_WATCH = 'DAILY_WATCH',
  WEEKLY_MEETING = 'WEEKLY_MEETING',
}

export enum DeptPrayerItemStatusDto {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ANSWERED = 'ANSWERED',
}

export class UpsertPrayerAssignmentDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  weekStart!: string;

  @IsEnum(PrayerBurdenTypeDto)
  burdenType!: PrayerBurdenTypeDto;

  @IsEnum(PrayerConfidentialityDto)
  confidentiality!: PrayerConfidentialityDto;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsUUID()
  relatedMemberId?: string;

  @IsOptional()
  @IsUUID()
  assignedMemberId?: string;
}

export class UpsertPrayerScheduleDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(PrayerScheduleTypeDto)
  eventType!: PrayerScheduleTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsString()
  startsAt!: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkPrayerScheduleAttendanceDto {
  @IsUUID()
  sessionId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  memberIds!: string[];

  @IsOptional()
  @IsBoolean()
  attended?: boolean;
}

export class CreatePrayerIntakeDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsEnum(PrayerIntakeCategoryDto)
  intakeCategory!: PrayerIntakeCategoryDto;

  @IsOptional()
  @IsEnum(PrayerConfidentialityDto)
  confidentiality?: PrayerConfidentialityDto;

  @IsOptional()
  @IsString()
  requesterName?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsUUID()
  relatedMemberId?: string;

  @IsOptional()
  @IsUUID()
  assignedMemberId?: string;
}

export class UpdatePrayerIntakeDto {
  @IsOptional()
  @IsEnum(DeptPrayerItemStatusDto)
  status?: DeptPrayerItemStatusDto;

  @IsOptional()
  @IsUUID()
  assignedMemberId?: string;

  @IsOptional()
  @IsBoolean()
  isAnswered?: boolean;

  @IsOptional()
  @IsString()
  answeredNote?: string;

  @IsOptional()
  @IsEnum(PrayerIntakeCategoryDto)
  intakeCategory?: PrayerIntakeCategoryDto;

  @IsOptional()
  @IsEnum(PrayerConfidentialityDto)
  confidentiality?: PrayerConfidentialityDto;
}

export class CreatePrayerProgressNoteDto {
  @IsOptional()
  @IsUUID()
  prayerItemId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsString()
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsEnum(DeptPrayerItemStatusDto)
  statusAfter?: DeptPrayerItemStatusDto;
}

export class UpsertPrayerScriptureDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  serviceDate!: string;

  @IsString()
  @MaxLength(200)
  scriptureRef!: string;

  @IsOptional()
  @IsString()
  prayerPoints?: string;

  @IsOptional()
  @IsString()
  devotionTieIn?: string;

  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;
}
