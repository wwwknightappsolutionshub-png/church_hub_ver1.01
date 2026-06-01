import type { LandingTemplateId } from '@church-hub/shared-types';
import type { ChurchNavLink } from './ChurchLandingMobileNav';

export function churchLandingNavLinks(
  templateId: LandingTemplateId,
  options?: { showSocialFeed?: boolean; showCommunitySupport?: boolean },
): ChurchNavLink[] {
  const updatesHref = templateId === 'modern' ? '#messages' : '#announcements';
  const links: ChurchNavLink[] = [
    { href: '#about', label: 'About' },
    { href: '#services', label: 'Services' },
    { href: updatesHref, label: 'Updates' },
    { href: '#give', label: 'Membership' },
  ];
  if (options?.showCommunitySupport) {
    links.push({ href: '#community-support', label: 'Community' });
  }
  if (options?.showSocialFeed) {
    links.push({ href: '#reviews-messages', label: 'Reviews' });
  }
  links.push({ href: '#contact', label: 'Contact' });
  return links;
}
