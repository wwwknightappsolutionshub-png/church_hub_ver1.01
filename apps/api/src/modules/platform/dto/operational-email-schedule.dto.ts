import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class OperationalEmailScheduleEntryDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @IsString()
  @MaxLength(64)
  timeZone!: string;
}

export class UpdateOperationalEmailSchedulesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => OperationalEmailScheduleEntryDto)
  departmentDigest?: OperationalEmailScheduleEntryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperationalEmailScheduleEntryDto)
  cellDigest?: OperationalEmailScheduleEntryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperationalEmailScheduleEntryDto)
  sundayAttendance?: OperationalEmailScheduleEntryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OperationalEmailScheduleEntryDto)
  membershipWeekly?: OperationalEmailScheduleEntryDto;
}
