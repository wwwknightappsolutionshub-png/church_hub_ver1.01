import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { SermonNoteSourceType } from '@prisma/client';

const SERMON_NOTE_SOURCE_TYPE = ['AUDIO', 'TEXT', 'PDF'] as const;

export class CreateSermonNoteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsEnum(SERMON_NOTE_SOURCE_TYPE)
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
