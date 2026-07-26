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

export const CHURCH_ASSIGNABLE_ROLES = [
  'ADMIN',
  'PASTOR',
  'LEADER',
  'PROVINCIAL_LEADER',
  'MEMBER',
  'DRIVER',
] as const;

export type ChurchAssignableRole = (typeof CHURCH_ASSIGNABLE_ROLES)[number];

export class CreateChurchStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
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
