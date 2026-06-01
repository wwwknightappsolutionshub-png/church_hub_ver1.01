import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SermonNoteSourceType } from '@prisma/client';

export class CreateSermonNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsEnum(SermonNoteSourceType)
  sourceType!: SermonNoteSourceType;

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
  pastorContext?: string;
}
