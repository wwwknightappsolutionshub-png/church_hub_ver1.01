import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSermonNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  speakerName?: string;

  @IsOptional()
  @IsDateString()
  sundayDate?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  sourceText?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  pastorContext?: string;
}
