import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsOptionalFlexiblePhone } from '../../../common/decorators/is-optional-phone.decorator';

export const CHURCH_ASSIGNABLE_ROLES = [
  'ADMIN',
  'PASTOR',
  'LEADER',
  'PROVINCIAL_LEADER',
  'MEMBER',
  'DRIVER',
] as const;

export type ChurchAssignableRole = (typeof CHURCH_ASSIGNABLE_ROLES)[number];

function trimLower(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateChurchStaffDto {
  @Transform(({ value }) => trimLower(value))
  @IsEmail()
  @MaxLength(255)
  email!: string;

  /** Optional — when omitted, a random password is generated and a set-password link is emailed. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsOptionalFlexiblePhone()
  @MaxLength(40)
  phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHURCH_ASSIGNABLE_ROLES, { each: true })
  roles!: ChurchAssignableRole[];

  /** Unit this person leads as unit admin (required for LEADER without ADMIN/PASTOR). Max one. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  serviceUnitIds?: string[];
}

export class UpdateChurchStaffDto {
  @IsOptional()
  @Transform(({ value }) => trimLower(value))
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsOptionalFlexiblePhone()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHURCH_ASSIGNABLE_ROLES, { each: true })
  roles?: ChurchAssignableRole[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** When provided, replaces unit-admin leadership (max one unit per staff account). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsUUID('4', { each: true })
  serviceUnitIds?: string[];
}
