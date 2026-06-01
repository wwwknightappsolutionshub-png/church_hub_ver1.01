import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDevotionalPlanDayDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  scriptureRef?: string;

  @IsOptional()
  @IsString()
  scriptureText?: string;

  @IsOptional()
  @IsString()
  reflection?: string;

  @IsOptional()
  @IsString()
  prayerPrompt?: string;

  @IsOptional()
  @IsString()
  actionPoint?: string;
}
