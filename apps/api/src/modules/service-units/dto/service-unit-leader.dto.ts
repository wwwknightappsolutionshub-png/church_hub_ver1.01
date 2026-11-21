import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export class AddServiceUnitLeaderDto {
  @IsOptional()
  @IsUUID('4')
  memberId?: string;

  @ValidateIf((o: AddServiceUnitLeaderDto) => !o.memberId)
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @ValidateIf((o: AddServiceUnitLeaderDto) => !o.memberId)
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

  /** LEADER / UNIT ADMIN designation, or ASSISTANT / SECRETARY for deputies. */
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsBoolean()
  isModerator?: boolean;

  @IsOptional()
  @IsBoolean()
  isUnitAdmin?: boolean;

  /** Explicit deputy kind (preferred over free-text role for assistants). */
  @IsOptional()
  @IsIn(['ASSISTANT', 'SECRETARY'])
  deputyRole?: 'ASSISTANT' | 'SECRETARY';
}
