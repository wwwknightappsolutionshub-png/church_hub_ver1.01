import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

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
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(CHURCH_ASSIGNABLE_ROLES, { each: true })
  roles!: ChurchAssignableRole[];
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
  @Transform(({ value }) => trimString(value))
  @IsString()
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
}
