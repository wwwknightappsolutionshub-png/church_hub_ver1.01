import { IsBoolean, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ResetTenantUserPasswordDto {
  /**
   * Optional custom password. When omitted, a temporary password is generated.
   * Minimum 8 characters when provided.
   */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).length > 0)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword?: string;

  /** Force the user to set a new password on next sign-in. Defaults to true. */
  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;

  /** Email the new credentials to the user. Defaults to true. */
  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean;
}
