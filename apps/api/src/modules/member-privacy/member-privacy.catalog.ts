/** Canonical field keys for member/family privacy + GUI. */

export type FieldVisibility = 'VISIBLE' | 'RESTRICTED' | 'HIDDEN';
export type FieldEditability = 'EDITABLE' | 'READ_ONLY' | 'LOCKED';

export type FieldBucket =
  | 'ops_visible'
  | 'leadership_only'
  | 'pastor_gated'
  | 'leadership_gated';

export type MemberPrivacyFieldDef = {
  fieldKey: string;
  label: string;
  group: string;
  /** Hardcoded floor for non-Admin/Pastor ops viewers */
  opsFloor: FieldVisibility;
  bucket: FieldBucket;
  entity: 'member' | 'family' | 'system';
};

/** Fields ops roles may see clearly (locked policy A + city + family name). */
export const MEMBER_PRIVACY_FIELD_CATALOG: MemberPrivacyFieldDef[] = [
  // Identity — ops visible
  { fieldKey: 'member.id', label: 'Member ID', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.firstName', label: 'First name', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.lastName', label: 'Last name', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.title', label: 'Title', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.middleName', label: 'Middle name', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.suffix', label: 'Suffix', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.nickname', label: 'Nickname', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.avatarUrl', label: 'Avatar', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.gender', label: 'Gender', group: 'Identity', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },

  // Status / ministry — ops visible
  { fieldKey: 'member.status', label: 'Status', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.roles', label: 'Member roles', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.classification', label: 'Classification', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.familyRole', label: 'Family role label', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.ministryInterests', label: 'Ministry interests', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.membershipDate', label: 'Membership date', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.friendDate', label: 'Friend date', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.onboardingStep', label: 'Onboarding step', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.specialOccasion', label: 'Special occasion', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.specialOccasionDate', label: 'Special occasion date', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.bio', label: 'Bio', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.bornAgain', label: 'Born again', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.baptizedInHolySpirit', label: 'Baptized in Holy Spirit', group: 'Status / ministry', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.cellBranchName', label: 'Cell / branch name', group: 'Operational links', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'member.serviceUnitNames', label: 'Service unit names', group: 'Operational links', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },
  { fieldKey: 'family.name', label: 'Family name', group: 'Operational links', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'family' },
  { fieldKey: 'member.city', label: 'City', group: 'Address', opsFloor: 'VISIBLE', bucket: 'ops_visible', entity: 'member' },

  // Contact — leadership only
  { fieldKey: 'member.email', label: 'Email', group: 'Contact', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.workEmail', label: 'Work email', group: 'Contact', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.phone', label: 'Phone', group: 'Contact', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.homePhone', label: 'Home phone', group: 'Contact', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.workPhone', label: 'Work phone', group: 'Contact', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.cellPhone', label: 'Cell phone', group: 'Contact', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },

  // Address — leadership (city already ops)
  { fieldKey: 'member.address', label: 'Address', group: 'Address', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.address2', label: 'Address line 2', group: 'Address', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.state', label: 'State / region', group: 'Address', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.zip', label: 'Postcode / ZIP', group: 'Address', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.country', label: 'Country', group: 'Address', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },

  // Family tree — leadership
  { fieldKey: 'family.members', label: 'Household members', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.parentChildLinks', label: 'Parent / child links', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.mapPins', label: 'Family map pins', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.address', label: 'Family address', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.address2', label: 'Family address line 2', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.city', label: 'Family city', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.state', label: 'Family state', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.zip', label: 'Family postcode', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.country', label: 'Family country', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.homePhone', label: 'Family home phone', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.email', label: 'Family email', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.homeCell', label: 'Family home cell', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'family.headMemberId', label: 'Family head', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'family' },
  { fieldKey: 'member.familyId', label: 'Family ID', group: 'Family tree', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },

  // Other sensitive — leadership
  { fieldKey: 'member.dateOfBirth', label: 'Date of birth', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.hideAge', label: 'Hide age flag', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.facebook', label: 'Facebook', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.twitter', label: 'Twitter / X', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.linkedIn', label: 'LinkedIn', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.notes', label: 'Notes', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.customFields', label: 'Custom fields', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.properties', label: 'Property tags', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.userId', label: 'Linked login user', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },
  { fieldKey: 'member.deletedAt', label: 'Soft-delete timestamp', group: 'Sensitive profile', opsFloor: 'RESTRICTED', bucket: 'leadership_only', entity: 'member' },

  // Capability gates (documented in catalog for GUI; enforced at endpoints)
  { fieldKey: 'capability.pastoralNotes', label: 'Pastoral note content', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'pastor_gated', entity: 'system' },
  { fieldKey: 'capability.counseling', label: 'Counseling cases / sessions', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'pastor_gated', entity: 'system' },
  { fieldKey: 'capability.confidentialCarePrayer', label: 'Confidential care / prayer', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'pastor_gated', entity: 'system' },
  { fieldKey: 'capability.memberTrash', label: 'Soft-delete trash / restore', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'leadership_gated', entity: 'system' },
  { fieldKey: 'capability.bulkPiiExport', label: 'Bulk full unmasked PII export', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'pastor_gated', entity: 'system' },
  { fieldKey: 'capability.gdprHardDelete', label: 'GDPR hard-delete / anonymization', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'pastor_gated', entity: 'system' },
  { fieldKey: 'capability.assignStaffRoles', label: 'Assign ADMIN/PASTOR staff roles', group: 'Extra gates', opsFloor: 'HIDDEN', bucket: 'leadership_gated', entity: 'system' },
];

export const RESTRICTED_MARKER = {
  restricted: true as const,
  label: 'Restricted',
};

export function isRestrictedMarker(value: unknown): value is typeof RESTRICTED_MARKER {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { restricted?: boolean }).restricted === true
  );
}

/** Rank for merge: higher = more restrictive */
export function visibilityRank(v: FieldVisibility): number {
  if (v === 'HIDDEN') return 2;
  if (v === 'RESTRICTED') return 1;
  return 0;
}

export function stricterVisibility(a: FieldVisibility, b: FieldVisibility): FieldVisibility {
  return visibilityRank(a) >= visibilityRank(b) ? a : b;
}

export function editabilityRank(e: FieldEditability): number {
  if (e === 'LOCKED') return 2;
  if (e === 'READ_ONLY') return 1;
  return 0;
}

export function stricterEditability(a: FieldEditability, b: FieldEditability): FieldEditability {
  return editabilityRank(a) >= editabilityRank(b) ? a : b;
}
