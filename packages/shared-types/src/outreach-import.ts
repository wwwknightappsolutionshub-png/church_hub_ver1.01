import { z } from 'zod';
import { OutreachCaptureSchema } from './outreach';

/** Canonical outreach CSV fields → form capture fields. */
export const OUTREACH_IMPORT_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'email',
  'referredBy',
  'notes',
  'postcode',
  'locationLabel',
  'addressStreet',
  'addressCity',
  'addressState',
  'addressCountry',
  'addressPostal',
  'needsBusPickup',
  'pickupAddress',
  'busPickupNotes',
] as const;

export type OutreachImportField = (typeof OUTREACH_IMPORT_FIELDS)[number];

export const OUTREACH_IMPORT_FIELD_LABELS: Record<OutreachImportField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  phone: 'Phone',
  email: 'Email',
  referredBy: "Minister / referred by",
  notes: 'Notes / comments',
  postcode: 'UK postcode',
  locationLabel: 'Location label',
  addressStreet: 'Street address',
  addressCity: 'City',
  addressState: 'State / region',
  addressCountry: 'Country',
  addressPostal: 'Postal / ZIP',
  needsBusPickup: 'Needs bus pickup (yes/no)',
  pickupAddress: 'Pickup address',
  busPickupNotes: 'Bus pickup notes',
};

export const OUTREACH_IMPORT_HEADER_ALIASES: Record<OutreachImportField, string[]> = {
  firstName: ['first name', 'firstname', 'first_name', 'given name'],
  lastName: ['last name', 'lastname', 'last_name', 'surname'],
  phone: ['phone', 'mobile', 'cell', 'phone number', 'telephone'],
  email: ['email', 'email address', 'e-mail'],
  referredBy: ['referred by', 'referrer', 'minister', "minister's name", 'minister name', 'evangelist'],
  notes: ['notes', 'note', 'comments', 'comment', 'prayer request', 'prayer requests'],
  postcode: ['postcode', 'postal code', 'uk postcode'],
  locationLabel: ['location', 'location label', 'landmark'],
  addressStreet: ['street', 'street address', 'address street', 'address line 1', 'address1'],
  addressCity: ['city', 'town'],
  addressState: ['state', 'region', 'province'],
  addressCountry: ['country'],
  addressPostal: ['postal', 'zip', 'zip code', 'postal/zip'],
  needsBusPickup: ['needs bus', 'bus pickup', 'needs bus pickup'],
  pickupAddress: ['pickup address', 'pick up address', 'bus address'],
  busPickupNotes: ['bus notes', 'bus pickup notes', 'pickup notes'],
};

export const OUTREACH_IMPORT_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Referred By',
  'Notes',
  'Postcode',
  'Location Label',
  'Address Street',
  'Address City',
  'Address State',
  'Address Country',
  'Address Postal',
  'Needs Bus Pickup',
  'Pickup Address',
  'Bus Pickup Notes',
] as const;

export const OutreachImportColumnMappingSchema = z.object({
  firstName: z.string().min(1),
  phone: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().optional(),
  referredBy: z.string().optional(),
  notes: z.string().optional(),
  postcode: z.string().optional(),
  locationLabel: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressCountry: z.string().optional(),
  addressPostal: z.string().optional(),
  needsBusPickup: z.string().optional(),
  pickupAddress: z.string().optional(),
  busPickupNotes: z.string().optional(),
});

export type OutreachImportColumnMapping = z.infer<typeof OutreachImportColumnMappingSchema>;

export const OutreachImportOptionsSchema = z.object({
  skipDuplicatesInFile: z.boolean().default(true),
  /** Skip rows whose phone already exists as an outreach contact for this church. */
  skipExistingPhone: z.boolean().default(true),
});

export type OutreachImportOptions = z.infer<typeof OutreachImportOptionsSchema>;

export const OutreachImportRowActionSchema = z.enum(['CREATE', 'SKIP', 'ERROR']);
export type OutreachImportRowAction = z.infer<typeof OutreachImportRowActionSchema>;

export const OutreachImportJobStatusSchema = z.enum([
  'UPLOADED',
  'PREVIEWED',
  'COMMITTED',
  'FAILED',
]);

export const OutreachImportMappedRowSchema = z.object({
  firstName: z.string(),
  lastName: z.string().optional(),
  phone: z.string(),
  email: z.string().optional(),
  referredBy: z.string().optional(),
  notes: z.string().optional(),
  postcode: z.string().optional(),
  locationLabel: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressCountry: z.string().optional(),
  addressPostal: z.string().optional(),
  needsBusPickup: z.boolean().optional(),
  pickupAddress: z.string().optional(),
  busPickupNotes: z.string().optional(),
});

export type OutreachImportMappedRow = z.infer<typeof OutreachImportMappedRowSchema>;

export const OutreachImportPreviewRowSchema = z.object({
  rowIndex: z.number(),
  action: OutreachImportRowActionSchema.nullable(),
  error: z.string().nullable(),
  mapped: OutreachImportMappedRowSchema.partial(),
  raw: z.record(z.string()),
});

export const OutreachImportPreviewResponseSchema = z.object({
  jobId: z.string(),
  status: OutreachImportJobStatusSchema,
  headers: z.array(z.string()),
  suggestedMapping: OutreachImportColumnMappingSchema.partial(),
  rows: z.array(OutreachImportPreviewRowSchema),
  rowCounts: z.object({
    total: z.number(),
    create: z.number(),
    skip: z.number(),
    error: z.number(),
  }),
});

export type OutreachImportPreviewResponse = z.infer<typeof OutreachImportPreviewResponseSchema>;

export const OutreachImportCommitResponseSchema = z.object({
  jobId: z.string(),
  status: OutreachImportJobStatusSchema,
  summary: z.object({
    created: z.number(),
    skipped: z.number(),
    failed: z.number(),
  }),
});

export type OutreachImportCommitResponse = z.infer<typeof OutreachImportCommitResponseSchema>;

export function buildOutreachImportTemplateCsv(): string {
  return `${OUTREACH_IMPORT_TEMPLATE_HEADERS.join(',')}\n`;
}

export function suggestOutreachColumnMapping(
  headers: string[],
): Partial<OutreachImportColumnMapping> {
  const normalized = headers.map((h) => ({
    original: h,
    key: h.trim().toLowerCase(),
  }));
  const mapping: Partial<OutreachImportColumnMapping> = {};
  for (const field of OUTREACH_IMPORT_FIELDS) {
    const aliases = [
      OUTREACH_IMPORT_FIELD_LABELS[field].toLowerCase(),
      ...OUTREACH_IMPORT_HEADER_ALIASES[field],
    ];
    const match = normalized.find((h) =>
      aliases.some((a) => h.key === a || h.key.includes(a)),
    );
    if (match) mapping[field] = match.original;
  }
  return mapping;
}

/** Parse yes/no style flags from CSV cells. */
export function parseCsvBoolean(value: string | undefined): boolean | undefined {
  if (value == null || !String(value).trim()) return undefined;
  const v = String(value).trim().toLowerCase();
  if (['yes', 'y', 'true', '1', 'on'].includes(v)) return true;
  if (['no', 'n', 'false', '0', 'off'].includes(v)) return false;
  return undefined;
}

/**
 * Validate a mapped outreach import row with the same rules as live capture
 * (flexible phone + international address when not UK).
 */
export function validateOutreachImportMappedRow(mapped: Record<string, unknown>) {
  return OutreachCaptureSchema.safeParse({
    firstName: mapped.firstName,
    lastName: mapped.lastName,
    phone: mapped.phone,
    email: mapped.email,
    referredBy: mapped.referredBy,
    notes: mapped.notes,
    postcode: mapped.postcode,
    locationLabel: mapped.locationLabel,
    addressStreet: mapped.addressStreet,
    addressCity: mapped.addressCity,
    addressState: mapped.addressState,
    addressCountry: mapped.addressCountry,
    addressPostal: mapped.addressPostal,
    needsBusPickup: mapped.needsBusPickup,
    pickupAddress: mapped.pickupAddress,
    busPickupNotes: mapped.busPickupNotes,
    photoConsent: false,
  });
}
