import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsOptionalFlexiblePhone } from '../../../common/decorators/is-optional-phone.decorator';

export class AssignServiceUnitMemberDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsOptionalFlexiblePhone()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsIn(['MEMBER', 'UNIT_ADMIN'])
  unitRole?: 'MEMBER' | 'UNIT_ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  designation?: string;
}

export class UpdateServiceUnitMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsOptionalFlexiblePhone()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsIn(['MEMBER', 'UNIT_ADMIN'])
  unitRole?: 'MEMBER' | 'UNIT_ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  designation?: string;
}
