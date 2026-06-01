import { z } from 'zod';

export const landingMembershipFormSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000),
  requireEmail: z.boolean(),
  showBornAgain: z.boolean(),
  showBaptizedInHolySpirit: z.boolean(),
  showServiceUnits: z.boolean(),
  serviceUnitsLabel: z.string().max(200),
  bornAgainLabel: z.string().max(200),
  baptizedLabel: z.string().max(200),
  createPortalAccount: z.boolean(),
  registrantEmailSubject: z.string().max(200),
  registrantEmailBody: z.string().max(5000),
  staffEmailSubject: z.string().max(200),
  staffEmailBody: z.string().max(5000),
});

export type LandingMembershipFormConfig = z.infer<typeof landingMembershipFormSchema>;

export const DEFAULT_LANDING_MEMBERSHIP_FORM: LandingMembershipFormConfig = {
  title: 'Membership registration',
  description:
    'Complete this form to register your interest in church membership. Our team will follow up with you shortly.',
  requireEmail: true,
  showBornAgain: true,
  showBaptizedInHolySpirit: true,
  showServiceUnits: true,
  serviceUnitsLabel: 'Where would you love to serve',
  bornAgainLabel: 'Are you born again?',
  baptizedLabel: 'Are you baptized in the Holy Spirit?',
  createPortalAccount: true,
  registrantEmailSubject: 'Welcome to {{churchName}} — your member portal access',
  registrantEmailBody: `Hello {{firstName}},

Thank you for registering with {{churchName}}.

Sign in to the member portal:
{{loginUrl}}

Email: {{email}}
Temporary password: {{tempPassword}}

Please change your password after your first sign-in.

Blessings,
{{churchName}} Team`,
  staffEmailSubject: 'New membership registration — {{memberName}}',
  staffEmailBody: `A new person registered via the church landing page.

Name: {{memberName}}
Email: {{email}}
Phone: {{phone}}
Born again: {{bornAgain}}
Baptized in the Holy Spirit: {{baptizedInHolySpirit}}
Service units: {{serviceUnits}}

View in Membership: {{membershipUrl}}`,
};

export function applyTemplateVars(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/** Merge stored church settings with defaults so public forms always have complete config */
export function mergeLandingMembershipFormConfig(
  stored?: Partial<LandingMembershipFormConfig> | null,
): LandingMembershipFormConfig {
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_LANDING_MEMBERSHIP_FORM };
  }
  const parsed = landingMembershipFormSchema.safeParse({
    ...DEFAULT_LANDING_MEMBERSHIP_FORM,
    ...stored,
  });
  return parsed.success ? parsed.data : { ...DEFAULT_LANDING_MEMBERSHIP_FORM };
}
