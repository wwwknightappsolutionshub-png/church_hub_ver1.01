import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOptionalFlexiblePhone } from '../../../common/decorators/is-optional-phone.decorator';

export class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsOptionalFlexiblePhone()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  avatarUrl?: string | null;
}
