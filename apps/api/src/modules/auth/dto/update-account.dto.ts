import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsOptionalFlexiblePhone } from '../../../common/decorators/is-optional-phone.decorator';

export class UpdateAccountDto {
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
  @IsOptionalFlexiblePhone()
  @MaxLength(40)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  avatarUrl?: string | null;
}
