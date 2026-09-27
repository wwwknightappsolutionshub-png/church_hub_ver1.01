import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BackupFrequency, BackupRequestStatus, BackupScope } from '@prisma/client';

export class CreateTenantBackupDto {
  @IsUUID()
  churchId!: string;
}

export class CreateBackupRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ReviewBackupRequestDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

export class UpsertBackupScheduleDto {
  @IsEnum(BackupScope)
  scope!: BackupScope;

  @IsOptional()
  @IsUUID()
  churchId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(BackupFrequency)
  frequency?: BackupFrequency;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hourUtc?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minuteUtc?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(28)
  dayOfPeriod?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays?: number;
}

export class ListBackupJobsQueryDto {
  @IsOptional()
  @IsEnum(BackupScope)
  scope?: BackupScope;

  @IsOptional()
  @IsUUID()
  churchId?: string;
}

export class ListBackupRequestsQueryDto {
  @IsOptional()
  @IsEnum(BackupRequestStatus)
  status?: BackupRequestStatus;
}
