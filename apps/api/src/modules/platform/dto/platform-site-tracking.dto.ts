import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlatformSiteTrackingDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  gtmContainerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  gaMeasurementId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  facebookPixelId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  googleSiteVerification?: string | null;
}
