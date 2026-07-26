import { IsString, MaxLength, MinLength } from 'class-validator';

/** Shared body for /auth/refresh and /auth/logout. */
export class RefreshTokenDto {
  @IsString()
  @MinLength(16)
  @MaxLength(512)
  refreshToken!: string;
}
