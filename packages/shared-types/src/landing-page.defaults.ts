import type { ChurchLandingContent, LandingTemplateId } from './landing-page';
import { buildDefaultAnnouncements } from './landing-page.announcements';
import { buildDefaultSocialFeed } from './landing-page.social-feed';
import { buildDefaultCommunitySupportSection } from './landing-page.community-support';
import { buildDefaultHeroSlides } from './landing-page.normalize';

function id() {
  return `item-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultChurchLanding(
  churchName: string,
  templateId: LandingTemplateId = 'classic',
): ChurchLandingContent {
  const heroSlides = buildDefaultHeroSlides(churchName);

  const base: ChurchLandingContent = {
    templateId,
    published: true,
    heroSlides,
    hero: {
      eyebrow: 'Welcome',
      headline: `Welcome to ${churchName}`,
      subheadline:
        'Join us in worship, fellowship, and the transforming power of God’s Word.',
      ctaLabel: 'Member sign in',
      ctaHref: '/login',
      secondaryCtaLabel: "I'm new here",
      secondaryCtaHref: '#visit',
    },
    about: {
      title: 'About Us',
      body: `${churchName} is a Christ-centered community where believers grow in faith, serve one another, and reach the world with the gospel. We invite you to worship with us and become part of our church family.`,
      readMoreHref: '#about',
      pastorName: 'Dr. Pastor',
      pastorTitle: 'Senior Pastor',
      pastorImageUrl:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80',
    },
    serviceTimes: [
      {
        id: id(),
        title: 'Sunday Worship Service',
        schedule: '10:00 AM',
        note: 'Main sanctuary',
      },
      {
        id: id(),
        title: 'Midweek Communion Service',
        schedule: 'Every Wednesday · 6:00 PM',
      },
      {
        id: id(),
        title: 'Covenant Hour of Prayer',
        schedule: 'Monday – Saturday · 5:30 AM',
      },
    ],
    quickLinks: [
      {
        id: id(),
        title: "I'm New Here",
        description: 'Plan your first visit and meet our welcome team.',
        href: '#visit',
      },
      {
        id: id(),
        title: 'Service Times',
        description: 'See when we gather for worship and prayer.',
        href: '#services',
      },
      {
        id: id(),
        title: 'Give',
        description: 'Partner with us in advancing the kingdom.',
        href: '#give',
      },
      {
        id: id(),
        title: 'Contact',
        description: 'Reach our church office for assistance.',
        href: '#contact',
      },
    ],
    announcements: buildDefaultAnnouncements(),
    stats: [
      { id: id(), label: 'Branches & fellowships', value: '12+' },
      { id: id(), label: 'Weekly services', value: '4' },
      { id: id(), label: 'Nations represented', value: '20+' },
    ],
    contact: {
      address: 'Update your church address in Church Landing settings',
      phone: '',
      email: 'office@yourchurch.org',
    },
    social: {},
    socialFeed: buildDefaultSocialFeed(churchName),
    communitySupport: buildDefaultCommunitySupportSection(),
    footerTagline: `${churchName} · All rights reserved.`,
  };

  if (templateId === 'modern') {
    return {
      ...base,
      mandate: {
        title: 'Our Mandate',
        quote:
          'The hour has come to liberate the world from all oppression of the devil through the preaching of the Word of Faith.',
        reference: 'Matthew 6:33 — Seek first the kingdom of God and His righteousness.',
      },
      hero: {
        ...base.hero,
        eyebrow: 'The Mandate',
        headline: 'Liberating the world through the preaching of the Word of Faith',
        subheadline: `We are delighted to have you with us at ${churchName}. You are most welcome.`,
      },
      quickLinks: [
        {
          id: id(),
          title: "I'm New Here",
          description: 'We welcome you warmly to our church family.',
          href: '#visit',
        },
        {
          id: id(),
          title: 'Covenant Hour of Prayer',
          description: 'Early morning connection with God.',
          href: '#services',
        },
        {
          id: id(),
          title: 'Listen to Messages',
          description: 'Catch up on recent sermons and teachings.',
          href: '#messages',
        },
        {
          id: id(),
          title: 'Join a Service Unit',
          description: 'Serve with your God-given gifts.',
          href: '#serve',
        },
      ],
    };
  }

  return base;
}
