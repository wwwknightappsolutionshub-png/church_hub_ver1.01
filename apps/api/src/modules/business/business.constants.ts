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

export const MENTORSHIP_FOCUS_AREAS = [
  'Entrepreneurship',
  'Career Development',
  'Financial Stewardship',
  'Marketing & Sales',
  'Leadership',
  'Faith & Work Integration',
  'Other',
] as const;

export const VERIFICATION_LABELS: Record<string, string> = {
  PENDING: 'Pending review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};
