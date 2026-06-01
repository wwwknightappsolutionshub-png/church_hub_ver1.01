import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Wisdom365VariantSlug, Wisdom365ContentStatus, Wisdom365SubscriptionStatus } from '@prisma/client';

export class CreateCheckoutDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  licenseCount!: number;
}

export class AssignVariantsDto {
  @IsUUID()
  subscriptionId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Wisdom365VariantSlug, { each: true })
  variantSlugs!: Wisdom365VariantSlug[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KidsGrantDto)
  kidsGrants?: KidsGrantDto[];
}

export class KidsGrantDto {
  @IsUUID()
  childMemberId!: string;

  @IsString()
  childDisplayName!: string;
}

export class UpsertReminderDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  minute!: number;

  @IsBoolean()
  alarmEnabled!: boolean;

  @IsString()
  timezone!: string;
}

export class CompleteJournalDto {
  @IsOptional()
  @IsString()
  journalText?: string;
}

export class UpdateProductConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  licensePricePence?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  multiLicenseDiscountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  multiLicenseMinCount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subscriptionDurationDays?: number;

  @IsOptional()
  @IsString()
  stripePriceId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertVariantDto {
  @IsEnum(Wisdom365VariantSlug)
  slug!: Wisdom365VariantSlug;

  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  imageUrl!: string;

  @IsString()
  bibleTranslationLabel!: string;

  @IsOptional()
  @IsString()
  bibleTranslationCode?: string;

  @IsOptional()
  @IsBoolean()
  requiresParentalConsent?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertContentEntryDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  dayOfYear!: number;

  @IsString()
  title!: string;

  @IsString()
  reference!: string;

  @IsString()
  passage!: string;

  @IsString()
  wisdom!: string;

  @IsString()
  application!: string;

  @IsString()
  prayer!: string;

  @IsString()
  theme!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  audioScriptHint?: string;

  @IsOptional()
  @IsEnum(Wisdom365ContentStatus)
  status?: Wisdom365ContentStatus;
}

export class UpdateContentEntryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dayOfYear?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  passage?: string;

  @IsOptional()
  @IsString()
  wisdom?: string;

  @IsOptional()
  @IsString()
  application?: string;

  @IsOptional()
  @IsString()
  prayer?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  audioScriptHint?: string | null;

  @IsOptional()
  @IsEnum(Wisdom365ContentStatus)
  status?: Wisdom365ContentStatus;
}

export class PublishBatchDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayFrom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayTo!: number;
}

export class SetChurchAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSubscriptionStatusDto {
  @IsEnum(Wisdom365SubscriptionStatus)
  status!: Wisdom365SubscriptionStatus;
}