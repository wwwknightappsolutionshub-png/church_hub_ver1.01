export const DEFAULT_CONGREGANT_CLASSIFICATIONS = [
  { code: 'MEMBER', name: 'Member', sortOrder: 1, isInactive: false },
  { code: 'REGULAR', name: 'Regular Attendee', sortOrder: 2, isInactive: false },
  { code: 'GUEST', name: 'Guest', sortOrder: 3, isInactive: false },
  { code: 'NON_ATTENDER', name: 'Non-Attender', sortOrder: 4, isInactive: true },
] as const;

export const DEFAULT_FAMILY_ROLES = [
  { code: 'HEAD', name: 'Head of Household', sortOrder: 1 },
  { code: 'SPOUSE', name: 'Spouse', sortOrder: 2 },
  { code: 'CHILD', name: 'Child', sortOrder: 3 },
  { code: 'OTHER', name: 'Other', sortOrder: 4 },
] as const;

export const DEFAULT_MEMBER_PROPERTIES = [
  { name: 'Do Not Call', description: 'Exclude from phone outreach', sortOrder: 1 },
  { name: 'Do Not Email', description: 'Exclude from email outreach', sortOrder: 2 },
  { name: 'Do Not SMS', description: 'Exclude from text outreach', sortOrder: 3 },
] as const;

export const DEFAULT_FAMILY_PROPERTIES = [
  { name: 'Homebound', description: 'Family receives home visits', sortOrder: 1 },
  { name: 'Newsletter', description: 'Receives church newsletter', sortOrder: 2 },
] as const;

export const AGE_DISTRIBUTION_BUCKETS = [
  { key: '0-12', label: '0–12', min: 0, max: 12 },
  { key: '13-17', label: '13–17', min: 13, max: 17 },
  { key: '18-29', label: '18–29', min: 18, max: 29 },
  { key: '30-49', label: '30–49', min: 30, max: 49 },
  { key: '50-64', label: '50–64', min: 50, max: 64 },
  { key: '65+', label: '65+', min: 65, max: 200 },
  { key: 'UNKNOWN', label: 'Unknown', min: -1, max: -1 },
] as const;
