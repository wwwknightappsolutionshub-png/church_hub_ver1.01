import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export enum ChoirVoicePartDto {
  SOPRANO = 'SOPRANO',
  TENOR = 'TENOR',
  ALTO = 'ALTO',
  BASS = 'BASS',
}

export enum ChoirRosterEventTypeDto {
  SUNDAY_MINISTRY = 'SUNDAY_MINISTRY',
  MIDWEEK_REHEARSAL = 'MIDWEEK_REHEARSAL',
}

export enum ChoirAttendanceEventTypeDto {
  REHEARSAL = 'REHEARSAL',
  SUNDAY_MINISTRY = 'SUNDAY_MINISTRY',
}

export enum ChoirAuditionStatusDto {
  SCHEDULED = 'SCHEDULED',
  PASSED = 'PASSED',
  DEFERRED = 'DEFERRED',
  DECLINED = 'DECLINED',
}

export class UpsertChoirRosterDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(ChoirRosterEventTypeDto)
  eventType!: ChoirRosterEventTypeDto;

  @IsString()
  startsAt!: string;

  @IsEnum(ChoirVoicePartDto)
  voicePart!: ChoirVoicePartDto;

  @IsUUID()
  memberId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ChoirSendRemindersDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class UpsertChoirSongDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  musicalKey?: string;

  @IsOptional()
  @IsInt()
  tempoBpm?: number;

  @IsOptional()
  @IsString()
  lyrics?: string;

  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @IsOptional()
  @IsString()
  audioSampleUrl?: string;

  @IsOptional()
  @IsString()
  sheetUrl?: string;

  @IsOptional()
  @IsString()
  chordChart?: string;

  @IsOptional()
  @IsString()
  practiceTrackUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransposeChoirSongDto {
  @IsInt()
  @Min(-11)
  @Max(11)
  semitones!: number;

  @IsOptional()
  @IsBoolean()
  updateChordChart?: boolean;
}

export class CreateChoirSetlistDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  serviceDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddChoirSetlistItemDto {
  @IsUUID()
  songId!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  musicalKey?: string;

  @IsOptional()
  @IsInt()
  tempoBpm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChoirSongFeedbackDto {
  @IsUUID()
  songId!: string;

  @IsOptional()
  @IsUUID()
  setlistId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficultyScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  comment?: string;
}

export enum ChoirSongAssetTypeDto {
  AUDIO = 'audio',
  SHEET = 'sheet',
  PRACTICE = 'practice',
}

export class UploadChoirSongAssetMetaDto {
  @IsEnum(ChoirSongAssetTypeDto)
  assetType!: ChoirSongAssetTypeDto;

  @IsOptional()
  @IsUUID()
  songId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;
}

export class UploadChoirAuditionMetaDto {
  @IsOptional()
  @IsUUID()
  auditionId?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class UpsertChoirAttendanceDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(ChoirAttendanceEventTypeDto)
  eventType!: ChoirAttendanceEventTypeDto;

  @IsString()
  eventDate!: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @IsOptional()
  @IsString()
  arrivedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minutesLate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkChoirAttendanceDto {
  @IsEnum(ChoirAttendanceEventTypeDto)
  eventType!: ChoirAttendanceEventTypeDto;

  @IsString()
  eventDate!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  memberIds!: string[];

  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minutesLate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertChoirAuditionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  memberId!: string;

  @IsOptional()
  @IsEnum(ChoirAuditionStatusDto)
  status?: ChoirAuditionStatusDto;

  @IsOptional()
  @IsEnum(ChoirVoicePartDto)
  voicePart?: ChoirVoicePartDto;

  @IsOptional()
  @IsString()
  auditionDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  recordingUrl?: string;
}

export class UpsertChoirVoiceTaskDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  memberId!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class CreateChoirVocalNoteDto {
  @IsUUID()
  memberId!: string;

  @IsString()
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsString()
  improvementTag?: string;
}
