import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const emptyToUndefined = (v: unknown) =>
  v === '' || v === null ? undefined : v;

export class PublicMembershipRegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bornAgain?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  baptizedInHolySpirit?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) && value.length === 0 ? undefined : value))
  @IsArray()
  @IsUUID('4', { each: true })
  serviceUnitIds?: string[];

  @ApiProperty({ description: 'Must accept Terms of Service' })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms of Service' })
  acceptedTerms!: boolean;

  @ApiProperty({ description: 'Must accept Privacy Policy' })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Privacy Policy' })
  acceptedPrivacy!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acceptedMarketing?: boolean;
}
