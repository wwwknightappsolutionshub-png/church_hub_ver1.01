export type MemberGenderDto = 'UNKNOWN' | 'MALE' | 'FEMALE';

export type MembershipCustomFieldTypeDto =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'BOOLEAN'
  | 'PHONE'
  | 'LINK';

export interface CongregantClassificationDto {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isInactive: boolean;
  isActive: boolean;
}

export interface FamilyRoleDefinitionDto {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CustomFieldDefinitionDto {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: MembershipCustomFieldTypeDto;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  options: string[];
}

export interface PropertyDefinitionDto {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CongregantServiceUnitOptionDto {
  id: string;
  name: string;
  departmentCode?: string | null;
  departmentLabel?: string | null;
}

export interface CongregantCellBranchOptionDto {
  id: string;
  name: string;
}

export interface MembershipRegistryCatalogDto {
  classifications: CongregantClassificationDto[];
  familyRoles: FamilyRoleDefinitionDto[];
  memberCustomFields: CustomFieldDefinitionDto[];
  familyCustomFields: CustomFieldDefinitionDto[];
  memberProperties: PropertyDefinitionDto[];
  familyProperties: PropertyDefinitionDto[];
  serviceUnits: CongregantServiceUnitOptionDto[];
  cellBranches: CongregantCellBranchOptionDto[];
}

export interface MembershipDashboardStatsDto {
  total: number;
  inOnboarding: number;
  families: number;
  churchUnits: number;
  congregants: number;
  childrenChurch: number;
  byStatus: Record<string, number>;
}

export interface ChartCountDto {
  label: string;
  count: number;
}

export interface MembershipCongregantAnalyticsDto {
  byClassification: ChartCountDto[];
  byGender: ChartCountDto[];
  byFamilyRole: ChartCountDto[];
  byAgeDistribution: ChartCountDto[];
}

export interface MembershipEmailLinksDto {
  all: string;
  bcc: string;
  byFamilyRole: Array<{ role: string; all: string; bcc: string }>;
}

export interface CongregantEditorPayloadDto {
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender?: MemberGenderDto;
  email?: string;
  workEmail?: string;
  phone?: string;
  homePhone?: string;
  workPhone?: string;
  cellPhone?: string;
  dateOfBirth?: string;
  hideAge?: boolean;
  membershipDate?: string;
  friendDate?: string;
  classificationId?: string | null;
  familyId?: string | null;
  createFamily?: boolean;
  familyRoleId?: string | null;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  facebook?: string;
  twitter?: string;
  linkedIn?: string;
  notes?: string;
  status?: string;
  roles?: string[];
  ministryInterests?: string[];
  customFields?: Record<string, string | boolean | null>;
  propertyIds?: string[];
  specialOccasion?: string;
  specialOccasionDate?: string;
  serviceUnitIds?: string[];
  cellBranchId?: string | null;
  /** When true, API validates email, phone, address, and post code (congregant editor). */
  requireContactFields?: boolean;
}

export interface CelebrationBirthdayItemDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  date: string;
  label: string;
  age?: number | null;
}

export interface CelebrationAnniversaryItemDto {
  id: string;
  type: 'member' | 'family';
  name: string;
  email?: string | null;
  occasion: string;
  date: string;
  label: string;
}

export interface CelebrationPaginatedListDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MembershipCelebrationsDto {
  windowDays: number;
  birthdays: CelebrationPaginatedListDto<CelebrationBirthdayItemDto>;
  anniversaries: CelebrationPaginatedListDto<CelebrationAnniversaryItemDto>;
}

export interface CelebrationEmailTemplateDto {
  id: string;
  kind: 'BIRTHDAY' | 'ANNIVERSARY';
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  autoSend: boolean;
}

export interface FamilyMapPinDto {
  id: string;
  name: string;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  address?: string | null;
  memberCount: number;
  lat: number;
  lng: number;
}

export interface MembershipFamilyMapDto {
  pins: FamilyMapPinDto[];
  skipped: number;
}

export interface PaginatedMembersDto<T = unknown> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  nextCursor: string | null;
}

export interface UsheringWeeklyHeadcountDto {
  id: string;
  weekStart: string;
  male: number;
  female: number;
  babies: number;
  children: number;
  totalAttendees: number;
}

export interface UsheringWeeklyAttendanceFlowDto {
  source: 'ushering';
  serviceUnitId: string | null;
  serviceUnitName: string | null;
  weeks: Array<{
    period: string;
    male: number;
    female: number;
    babies: number;
    children: number;
    totalAttendees: number;
    present: number;
    absent: number;
    rate: number;
  }>;
}
