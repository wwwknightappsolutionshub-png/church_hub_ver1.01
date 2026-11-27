import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PlatformGuideStatus } from '@prisma/client';

export class GuideFaqDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  question!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(800)
  answer!: string;
}

export class UpsertGuidePageDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  coverImagePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  coverImageAlt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80_000)
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => GuideFaqDto)
  faqs?: GuideFaqDto[];

  @IsOptional()
  @IsBoolean()
  showOnHomepage?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(PlatformGuideStatus)
  status?: PlatformGuideStatus;
}
