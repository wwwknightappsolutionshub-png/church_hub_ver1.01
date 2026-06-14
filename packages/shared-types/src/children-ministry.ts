export type ChildrenClassGroup = 'AGES_3_5' | 'AGES_6_9' | 'AGES_10_12';

export interface ChildrenClassDefinitionDto {
  id: string;
  code: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  ages: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

export interface ChildrenClassGroupOptionDto {
  id?: string;
  value: string;
  label: string;
  ages: string;
  minAge?: number | null;
  maxAge?: number | null;
}

export interface ChildrenMinistryAccessDto {
  canAccess: boolean;
  isChurchStaff: boolean;
  isChildrenChurchAdmin: boolean;
}

export interface ChildrenMinistryListItemDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  age: number | null;
  classGroup: ChildrenClassGroup | null;
  classLabel: string | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  parentCount: number;
}

export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChildrenMinistryChildDetailDto {
  child: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    age: number | null;
    family: { id: string; name: string } | null;
    ministryInterests: string[];
  };
  classGroup: ChildrenClassGroup | null;
  classLabel: string | null;
  teacher: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  assistant: { id: string; firstName: string; lastName: string; email?: string | null } | null;
  connectionTree: Array<{
    relation: string;
    parent: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
    siblings: Array<{ id: string; firstName: string; lastName: string; relation: string }>;
  }>;
}

export interface ChildrenMinistryParentDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  children: Array<{ id: string; firstName: string; lastName: string; relation: string }>;
}

export interface ChildrenMinistryTeacherDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  roles: string[];
  classGroups: string[];
  isChildrenChurchAdmin: boolean;
}

export interface ChildrenMinistryBirthdayDto {
  childId: string;
  childName: string;
  date: string;
  label: string;
  age: number | null;
  parents: Array<{ id: string; name: string; email: string | null }>;
}

export interface ChildrenSundayReportClassRowInput {
  classGroup: ChildrenClassGroup;
  boys: number;
  girls: number;
}

export interface ChildrenSundayReportSubmitDto {
  serviceDate?: string;
  classes: ChildrenSundayReportClassRowInput[];
  otherComments?: string;
}

export interface ChildrenSundayReportClassRowResult {
  classGroup: ChildrenClassGroup;
  classLabel: string;
  boys: number;
  girls: number;
  total: number;
}

export interface ChildrenSundayReportResultDto {
  reportId: string;
  serviceDate: string;
  notificationsQueued: number;
  stats: {
    boys: number;
    girls: number;
    total: number;
    classes: ChildrenSundayReportClassRowResult[];
  };
  body: string;
}

export interface ChildrenRegistrationFamilyMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  familyRole: string | null;
}

export interface ChildrenRegistrationFamilyOptionDto {
  id: string;
  name: string;
  city: string | null;
  homePhone: string | null;
  email: string | null;
  members: ChildrenRegistrationFamilyMemberDto[];
}

export interface ChildrenRegistrationGuardianOptionDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface ChildrenRegistrationCatalogDto {
  classifications: import('./membership-registry').CongregantClassificationDto[];
  familyRoles: import('./membership-registry').FamilyRoleDefinitionDto[];
  memberCustomFields: import('./membership-registry').CustomFieldDefinitionDto[];
  familyCustomFields: import('./membership-registry').CustomFieldDefinitionDto[];
  memberProperties: import('./membership-registry').PropertyDefinitionDto[];
  familyProperties: import('./membership-registry').PropertyDefinitionDto[];
  classGroups: ChildrenClassGroupOptionDto[];
  families: Array<{ id: string; name: string }>;
}

export interface ChildrenRegistrationNewFamilyDto {
  name: string;
  homeCell?: string;
  specialOccasion?: string;
  specialOccasionDate?: string | null;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  homePhone?: string;
  email?: string;
  customFields?: Record<string, string | boolean | null>;
  propertyIds?: string[];
}

export interface ChildrenRegistrationGuardianInputDto {
  mode: 'existing' | 'new';
  relation: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface RegisterChildWizardDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: 'UNKNOWN' | 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  cellPhone?: string;
  homePhone?: string;
  classGroup?: ChildrenClassGroup;
  schoolName?: string;
  gradeLevel?: string;
  notes?: string;
  classificationId?: string | null;
  familyMode: 'existing' | 'new';
  familyId?: string;
  familyRoleId?: string | null;
  newFamily?: ChildrenRegistrationNewFamilyDto;
  guardians?: ChildrenRegistrationGuardianInputDto[];
}
