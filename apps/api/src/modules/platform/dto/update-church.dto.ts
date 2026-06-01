import { IsBoolean, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateChurchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Partial map of module id → enabled */
  @IsOptional()
  @IsObject()
  tenantModules?: Record<string, boolean>;

  /** Department module visibility and tab toggles per department code. */
  @IsOptional()
  @IsObject()
  departmentModuleSettings?: {
    enabledModules?: Record<string, boolean>;
    tabs?: Record<string, Record<string, boolean>>;
  };
}
