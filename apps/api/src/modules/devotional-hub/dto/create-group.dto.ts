import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { DevotionalGroupVisibility } from '@prisma/client';

export class CreateDevotionalGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsEnum(DevotionalGroupVisibility)
  visibility?: DevotionalGroupVisibility;

  @IsOptional()
  @IsString()
  planId?: string;
}

export class UpdateDevotionalGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsEnum(DevotionalGroupVisibility)
  visibility?: DevotionalGroupVisibility;

  @IsOptional()
  @IsString()
  planId?: string;
}

export class InviteToGroupDto {
  @IsOptional()
  @IsString()
  inviteeEmail?: string;

  @IsOptional()
  @IsString()
  inviteePhone?: string;

  /** Login email (username) */
  @IsOptional()
  @IsString()
  inviteeUserEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}

export class RegenerateInviteLinkDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}
