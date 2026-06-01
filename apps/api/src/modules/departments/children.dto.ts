import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export enum ChildrenClassGroupDto {
  AGES_3_5 = 'AGES_3_5',
  AGES_6_9 = 'AGES_6_9',
  AGES_10_12 = 'AGES_10_12',
}

export enum ChildrenCurriculumSourceDto {
  OFFICIAL_WEEKLY = 'OFFICIAL_WEEKLY',
  CUSTOM_UPLOAD = 'CUSTOM_UPLOAD',
}

export class UpsertChildrenRosterDto {
  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsEnum(ChildrenClassGroupDto)
  classGroup!: ChildrenClassGroupDto;

  @IsUUID()
  teacherMemberId!: string;

  @IsOptional()
  @IsUUID()
  assistantMemberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ChildrenSendRemindersDto {
  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class CreateChildrenCurriculumDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  body?: string;

  @IsOptional()
  @IsEnum(ChildrenCurriculumSourceDto)
  source?: ChildrenCurriculumSourceDto;

  @IsOptional()
  @IsEnum(ChildrenClassGroupDto)
  targetClassGroup?: ChildrenClassGroupDto;
}

export class UploadChildrenCurriculumMetaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsOptional()
  @IsEnum(ChildrenClassGroupDto)
  targetClassGroup?: ChildrenClassGroupDto;
}

export class SimplifyChildrenCurriculumDto {
  @IsEnum(ChildrenClassGroupDto)
  classGroup!: ChildrenClassGroupDto;
}

export class CreateChildrenClassReportDto {
  @IsEnum(ChildrenClassGroupDto)
  classGroup!: ChildrenClassGroupDto;

  @IsOptional()
  @IsString()
  serviceDate?: string;

  @IsUUID()
  teacherMemberId!: string;

  @IsOptional()
  @IsUUID()
  curriculumId?: string;

  @IsString()
  @MaxLength(10000)
  lessonTaught!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  behaviorNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  attentionNotes?: string;

  @IsOptional()
  @IsBoolean()
  escalatePastoralCare?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  pastoralSummary?: string;
}
