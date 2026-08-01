import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CookieConsentDto {
  @IsIn(['accepted', 'essential'])
  choice!: 'accepted' | 'essential';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;
}
