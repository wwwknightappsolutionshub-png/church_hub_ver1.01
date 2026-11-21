import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export class CreateServiceUnitDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(1000)
  activities?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}

/** Whitelisted fields only — blocks mass-assignment of churchId / departmentCode / etc. */
export class UpdateServiceUnitDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : emptyToUndefined(value)))
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : emptyToUndefined(value)))
  @IsString()
  @MaxLength(1000)
  activities?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : emptyToUndefined(value)))
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Roster pick or find-or-create person for unit setup / import. */
export class ServiceUnitPersonInputDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ValidateIf((o: ServiceUnitPersonInputDto) => !o.memberId)
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @ValidateIf((o: ServiceUnitPersonInputDto) => !o.memberId)
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class CreateServiceUnitWithSetupDto extends CreateServiceUnitDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ServiceUnitPersonInputDto)
  members?: ServiceUnitPersonInputDto[];

  /** Unit admin (leader). Omit or null to skip. */
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @ValidateNested()
  @Type(() => ServiceUnitPersonInputDto)
  leader?: ServiceUnitPersonInputDto | null;
}
