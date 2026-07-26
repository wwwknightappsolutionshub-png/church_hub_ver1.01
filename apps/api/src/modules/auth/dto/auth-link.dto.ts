import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

function trimLower(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => trimLower(value))
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class RequestMagicLinkDto {
  @Transform(({ value }) => trimLower(value))
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

export class ConsumeMagicLinkDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}
