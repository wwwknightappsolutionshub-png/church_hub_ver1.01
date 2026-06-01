import {
  DEFAULT_LANDING_MEMBERSHIP_FORM,
  landingMembershipFormSchema,
  type LandingMembershipFormConfig,
} from '@church-hub/shared-types';

/** Merge stored church settings with defaults (local helper — dist may lag behind src) */
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
