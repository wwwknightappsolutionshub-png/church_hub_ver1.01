import { z } from 'zod';
import { MemberRoleSchema, MemberStatusSchema } from './enums';

/** Canonical import fields → common CSV header aliases (lowercase match). */
export const MEMBERSHIP_IMPORT_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'status',
  'roles',
  'address',
  'city',
  'dateOfBirth',
  'notes',
  'bornAgain',
  'baptizedInHolySpirit',
  'familyName',
  'headOfHousehold',
  'attendanceDate',
  'attendancePresent',
  'churchServiceName',
  'classCode',
  'followUpStage',
] as const;

export type MembershipImportField = (typeof MEMBERSHIP_IMPORT_FIELDS)[number];

export const MEMBERSHIP_IMPORT_FIELD_LABELS: Record<MembershipImportField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  status: 'Member status',
  roles: 'Roles (comma-separated)',
  address: 'Address',
  city: 'City',
  dateOfBirth: 'Date of birth',
  notes: 'Notes',
  bornAgain: 'Born again (yes/no)',
  baptizedInHolySpirit: 'Baptized in Holy Spirit (yes/no)',
  familyName: 'Household / family name',
  headOfHousehold: 'Head of household (yes/no)',
  attendanceDate: 'Attendance date (YYYY-MM-DD)',
  attendancePresent: 'Attendance present (yes/no)',
  churchServiceName: 'Service name (for attendance)',
  classCode: 'Class code (e.g. 101)',
  followUpStage: 'Follow-up stage (leads import)',
};

export const MEMBERSHIP_IMPORT_HEADER_ALIASES: Record<MembershipImportField, string[]> = {
  firstName: ['first name', 'firstname', 'first_name', 'given name'],
  lastName: ['last name', 'lastname', 'last_name', 'surname', 'family name'],
  email: ['email', 'email address', 'e-mail'],
  phone: ['phone', 'mobile', 'cell', 'phone number', 'telephone'],
  status: ['status', 'member status', 'membership status'],
  roles: ['roles', 'role', 'member roles'],
  address: ['address', 'street', 'street address'],
  city: ['city', 'town'],
  dateOfBirth: ['date of birth', 'dob', 'birthdate', 'birth date'],
  notes: ['notes', 'note', 'comments'],
  bornAgain: ['born again', 'born_again'],
  baptizedInHolySpirit: ['baptized', 'holy spirit', 'baptized in holy spirit'],
  familyName: ['household', 'family', 'family name', 'household name'],
  headOfHousehold: ['head of household', 'household head', 'is head'],
  attendanceDate: ['attendance date', 'service date', 'attended on'],
  attendancePresent: ['present', 'attendance', 'attended'],
  churchServiceName: ['service', 'service name', 'church service'],
  classCode: ['class', 'class code', 'membership class'],
  followUpStage: ['follow up stage', 'pipeline stage', 'stage'],
};

/** CSV template header row for download. */
export const MEMBERSHIP_IMPORT_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Status',
  'Roles',
  'Address',
  'City',
  'Date of Birth',
  'Notes',
  'Household Name',
  'Head of Household',
  'Attendance Date',
  'Attendance Present',
  'Service Name',
  'Class Code',
] as const;

export const MembershipImportColumnMappingSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
    roles: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    dateOfBirth: z.string().optional(),
    notes: z.string().optional(),
    bornAgain: z.string().optional(),
    baptizedInHolySpirit: z.string().optional(),
    familyName: z.string().optional(),
    headOfHousehold: z.string().optional(),
    attendanceDate: z.string().optional(),
    attendancePresent: z.string().optional(),
    churchServiceName: z.string().optional(),
    classCode: z.string().optional(),
    followUpStage: z.string().optional(),
  });

export type MembershipImportColumnMapping = z.infer<typeof MembershipImportColumnMappingSchema>;

export const MembershipImportOptionsSchema = z.object({
  mode: z.enum(['MEMBERS', 'LEADS']).default('MEMBERS'),
  updateExisting: z.boolean().default(true),
  skipDuplicatesInFile: z.boolean().default(true),
});

export type MembershipImportOptions = z.infer<typeof MembershipImportOptionsSchema>;

export const MembershipImportMappedRowSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  status: MemberStatusSchema.optional(),
  roles: z.array(MemberRoleSchema).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  bornAgain: z.boolean().optional(),
  baptizedInHolySpirit: z.boolean().optional(),
  familyName: z.string().optional(),
  headOfHousehold: z.boolean().optional(),
  attendanceDate: z.string().optional(),
  attendancePresent: z.boolean().optional(),
  churchServiceName: z.string().optional(),
  classCode: z.string().optional(),
  followUpStage: z.string().optional(),
});

export type MembershipImportMappedRow = z.infer<typeof MembershipImportMappedRowSchema>;

export const ImportRowActionSchema = z.enum(['CREATE', 'UPDATE', 'SKIP', 'ERROR']);
export type ImportRowAction = z.infer<typeof ImportRowActionSchema>;

export const ImportJobStatusSchema = z.enum(['UPLOADED', 'PREVIEWED', 'COMMITTED', 'FAILED']);

export const MembershipImportPreviewRowSchema = z.object({
  rowIndex: z.number(),
  action: ImportRowActionSchema.nullable(),
  error: z.string().nullable(),
  mapped: MembershipImportMappedRowSchema.partial(),
  raw: z.record(z.string()),
  existingMemberId: z.string().nullable().optional(),
});

export const MembershipImportPreviewResponseSchema = z.object({
  jobId: z.string(),
  status: ImportJobStatusSchema,
  headers: z.array(z.string()),
  suggestedMapping: MembershipImportColumnMappingSchema.partial(),
  rows: z.array(MembershipImportPreviewRowSchema),
  rowCounts: z.object({
    total: z.number(),
    create: z.number(),
    update: z.number(),
    skip: z.number(),
    error: z.number(),
  }),
});

export type MembershipImportPreviewResponse = z.infer<typeof MembershipImportPreviewResponseSchema>;

export const MembershipImportCommitResponseSchema = z.object({
  jobId: z.string(),
  status: ImportJobStatusSchema,
  summary: z.object({
    created: z.number(),
    updated: z.number(),
    skipped: z.number(),
    failed: z.number(),
    familiesCreated: z.number().optional(),
    attendanceRecorded: z.number().optional(),
    classesEnrolled: z.number().optional(),
    followUpsCreated: z.number().optional(),
  }),
});

export type MembershipImportCommitResponse = z.infer<typeof MembershipImportCommitResponseSchema>;

export function buildMembershipImportTemplateCsv(): string {
  return `${MEMBERSHIP_IMPORT_TEMPLATE_HEADERS.join(',')}\n`;
}

export function suggestColumnMapping(headers: string[]): Partial<MembershipImportColumnMapping> {
  const normalized = headers.map((h) => ({
    original: h,
    key: h.trim().toLowerCase(),
  }));
  const mapping: Partial<MembershipImportColumnMapping> = {};
  for (const field of MEMBERSHIP_IMPORT_FIELDS) {
    const aliases = [MEMBERSHIP_IMPORT_FIELD_LABELS[field].toLowerCase(), ...MEMBERSHIP_IMPORT_HEADER_ALIASES[field]];
    const match = normalized.find((h) => aliases.some((a) => h.key === a || h.key.includes(a)));
    if (match) mapping[field] = match.original;
  }
  return mapping;
}
