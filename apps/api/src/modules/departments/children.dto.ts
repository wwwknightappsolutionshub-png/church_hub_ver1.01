import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum ChildrenClassGroupDto {
  AGES_3_5 = 'AGES_3_5',
  AGES_6_9 = 'AGES_6_9',
  AGES_10_12 = 'AGES_10_12',
}

export enum ChildrenCurriculumSourceDto {
  OFFICIAL_WEEKLY = 'OFFICIAL_WEEKLY',
  CUSTOM_UPLOAD = 'CUSTOM_UPLOAD',
}

export class AddChildrenTeacherDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @IsOptional()
  @IsBoolean()
  makeCoordinator?: boolean;
}

export class UpsertChildrenRosterDto {
  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsString()
  @MaxLength(64)
  classGroup!: string;

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
  @IsString()
  @MaxLength(64)
  targetClassGroup?: string;
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
  @IsString()
  @MaxLength(64)
  targetClassGroup?: string;
}

export class SimplifyChildrenCurriculumDto {
  @IsString()
  @MaxLength(64)
  classGroup!: string;
}

export class AssignChildrenClassDto {
  @IsString()
  @MaxLength(64)
  classGroup!: string;
}

export class ChildrenSundayReportClassRowDto {
  @IsString()
  @MaxLength(64)
  classGroup!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  boys!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  girls!: number;
}

export class ChildrenSundayReportDto {
  @IsOptional()
  @IsString()
  serviceDate?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChildrenSundayReportClassRowDto)
  classes!: ChildrenSundayReportClassRowDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  otherComments?: string;
}

export class CreateChildrenClassReportDto {
  @IsString()
  @MaxLength(64)
  classGroup!: string;

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

export class ChildrenRegistrationNewFamilyDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  homeCell?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialOccasion?: string;

  @IsOptional()
  @IsString()
  specialOccasionDate?: string | null;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zip?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  customFields?: Record<string, string | boolean | null>;

  @IsOptional()
  propertyIds?: string[];
}

export class ChildrenRegistrationGuardianInputDto {
  @IsString()
  mode!: 'existing' | 'new';

  @IsString()
  @MaxLength(50)
  relation!: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class RegisterChildWizardDto {
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  cellPhone?: string;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  classGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  schoolName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gradeLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsUUID()
  classificationId?: string | null;

  @IsString()
  familyMode!: 'existing' | 'new';

  @IsOptional()
  @IsUUID()
  familyId?: string;

  @IsOptional()
  @IsUUID()
  familyRoleId?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChildrenRegistrationNewFamilyDto)
  newFamily?: ChildrenRegistrationNewFamilyDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChildrenRegistrationGuardianInputDto)
  guardians?: ChildrenRegistrationGuardianInputDto[];
}

export class CreateChildrenClassDefinitionDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateChildrenClassDefinitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
