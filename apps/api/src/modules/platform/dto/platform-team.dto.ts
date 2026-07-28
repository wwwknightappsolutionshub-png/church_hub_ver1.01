import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { PlatformPermissionKey } from '../platform-permissions.catalog';

export class CreatePlatformRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(48)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: PlatformPermissionKey[];
}

export class UpdatePlatformRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: PlatformPermissionKey[];
}

export class InvitePlatformStaffDto {
  @IsEmail()
  @MaxLength(190)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @IsUUID()
  roleId!: string;
}

export class UpdatePlatformStaffDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
