import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  DsarRequestStatus,
  PlatformCmsPageKind,
  PlatformCmsPageStatus,
} from '@prisma/client';

export class UpsertCmsPageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  htmlBody?: string;

  @IsOptional()
  @IsEnum(PlatformCmsPageStatus)
  status?: PlatformCmsPageStatus;

  @IsOptional()
  @IsEnum(PlatformCmsPageKind)
  kind?: PlatformCmsPageKind;
}

export class CreateCmsPageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsString()
  @MinLength(1)
  htmlBody!: string;

  @IsOptional()
  @IsEnum(PlatformCmsPageStatus)
  status?: PlatformCmsPageStatus;

  @IsOptional()
  @IsEnum(PlatformCmsPageKind)
  kind?: PlatformCmsPageKind;
}

export class UpdateDsarDto {
  @IsOptional()
  @IsEnum(DsarRequestStatus)
  status?: DsarRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  executeErasure?: boolean;
}

export class RecordConsentDto {
  @IsEnum(['PRIVACY', 'TERMS', 'COOKIES', 'MARKETING'] as const)
  consentType!: 'PRIVACY' | 'TERMS' | 'COOKIES' | 'MARKETING';

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  documentSlug!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  documentVersion?: number;

  @IsOptional()
  @IsBoolean()
  accepted?: boolean;
}
