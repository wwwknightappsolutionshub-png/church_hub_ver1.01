import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevotionalPrayerListScope } from '@prisma/client';

export class PrayerListItemDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  dayId?: string;
}

export class CreatePrayerListDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsEnum(DevotionalPrayerListScope)
  scope?: DevotionalPrayerListScope;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrayerListItemDto)
  items?: PrayerListItemDto[];
}

export class UpdatePrayerListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsBoolean()
  shareWithGroup?: boolean;

  @IsOptional()
  @IsString()
  groupId?: string;
}

export class UpdatePrayerItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;
}

export class PrayerBoosterDto {
  @IsOptional()
  @IsString()
  context?: string;
}
