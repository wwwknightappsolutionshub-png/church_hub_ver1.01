import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlatformWhatsAppDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sessionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apiKeyHeader?: string | null;

  /** New API key — omit to keep current. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string | null;

  @IsOptional()
  @IsBoolean()
  clearApiKey?: boolean;
}

export class TestPlatformWhatsAppDto {
  @IsString()
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
