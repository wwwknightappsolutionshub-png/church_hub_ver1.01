import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { DevotionalJournalVisibility } from '@prisma/client';
import { DEVOTIONAL_JOURNAL_VISIBILITY } from './prisma-enum-values';

class JournalAttachmentDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}

class JournalScriptureRefDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  reference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;
}

export class CreateJournalDto {
  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(DEVOTIONAL_JOURNAL_VISIBILITY)
  visibility?: DevotionalJournalVisibility;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  dayId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moods?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalScriptureRefDto)
  scriptureRefs?: JournalScriptureRefDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalAttachmentDto)
  attachments?: JournalAttachmentDto[];

  @IsOptional()
  @IsUrl()
  voiceNoteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  voiceTranscript?: string;

  @IsOptional()
  @IsString()
  recapPromptId?: string;
}

export class UpdateJournalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moods?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalScriptureRefDto)
  scriptureRefs?: JournalScriptureRefDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalAttachmentDto)
  attachments?: JournalAttachmentDto[];

  @IsOptional()
  @IsUrl()
  voiceNoteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  voiceTranscript?: string;

  @IsOptional()
  @IsString()
  recapPromptId?: string;
}

export class CreateJournalCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class JournalReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  emoji!: string;
}
