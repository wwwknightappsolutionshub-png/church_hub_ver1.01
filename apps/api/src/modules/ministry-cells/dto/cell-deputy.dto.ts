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

export class AssignCellDeputyDto {
  @IsIn(['ASSISTANT', 'SECRETARY'])
  role!: 'ASSISTANT' | 'SECRETARY';

  /** Existing church user (preferred). */
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** Find-or-create via linked member email / name when userId omitted. */
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
}
