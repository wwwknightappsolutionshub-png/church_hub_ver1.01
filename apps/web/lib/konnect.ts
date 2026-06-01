export const KONNECT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'directory', label: 'Directory' },
  { id: 'verification', label: 'Verification' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'jobs', label: 'Job Board' },
  { id: 'events', label: 'Networking' },
  { id: 'mentorship', label: 'Mentorship' },
  { id: 'ideas', label: 'Idea Hub' },
] as const;

export type KonnectTabId = (typeof KONNECT_TABS)[number]['id'];

export const BUSINESS_CATEGORIES = [
  'Professional Services',
  'Retail & E-commerce',
  'Food & Hospitality',
  'Technology',
  'Health & Wellness',
  'Construction & Trades',
  'Education & Training',
  'Creative & Media',
  'Finance & Insurance',
  'Other',
] as const;

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Volunteer', 'Internship', 'Remote'] as const;

export const MENTORSHIP_FOCUS = [
  'Entrepreneurship',
  'Career Development',
  'Financial Stewardship',
  'Marketing & Sales',
  'Leadership',
  'Faith & Work Integration',
  'Other',
] as const;

export const VERIFICATION_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export const MENTORSHIP_STATUS: Record<string, string> = {
  REQUESTED: 'Requested',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
