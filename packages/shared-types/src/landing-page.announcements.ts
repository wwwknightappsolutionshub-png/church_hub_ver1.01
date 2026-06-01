import type { LandingAnnouncement } from './landing-page';

export const ANNOUNCEMENT_CAROUSEL_COUNT = 6;

const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1438234227774-98e995acda46?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507692049790-de582cf2f655?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519491050285-c00150e935ec?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1470104185447-9c9c3ef9f0f4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1515169067868-7ef8bca8e4b4?auto=format&fit=crop&w=800&q=80',
] as const;

function slideId(n: number) {
  return `ann-default-${n}`;
}

/** Six announcement cards for the landing carousel (image + text). */
export function buildDefaultAnnouncements(): LandingAnnouncement[] {
  return [
    {
      id: slideId(1),
      title: 'Join Us This Sunday',
      body: 'Come expectant for a powerful time of worship and the Word. Invite family and friends to share in what God is doing.',
      dateLabel: 'Next Sunday',
      imageUrl: STOCK_IMAGES[0],
    },
    {
      id: slideId(2),
      title: 'Midweek Communion Service',
      body: 'Join us Wednesday for teaching, communion, and prayer. Come fasting and leave refreshed in spirit.',
      dateLabel: 'Every Wednesday',
      imageUrl: STOCK_IMAGES[1],
    },
    {
      id: slideId(3),
      title: 'Covenant Hour of Prayer',
      body: 'Start your day connecting with God through early-morning prayer and intercession for your family and nation.',
      dateLabel: 'Mon – Sat · 5:30 AM',
      imageUrl: STOCK_IMAGES[2],
    },
    {
      id: slideId(4),
      title: 'New Members Welcome',
      body: 'Planning your first visit? Our welcome team will help you find your place in the church family.',
      dateLabel: 'Ongoing',
      imageUrl: STOCK_IMAGES[3],
    },
    {
      id: slideId(5),
      title: 'Youth Alive Fellowship',
      body: 'A vibrant time of fellowship, the Word, and prayer for young people. Stay after service and bring a friend.',
      dateLabel: 'Monthly',
      imageUrl: STOCK_IMAGES[4],
    },
    {
      id: slideId(6),
      title: 'Outreach & Community Care',
      body: 'Partner with us as we reach our city with the gospel and support families in need through practical love.',
      dateLabel: 'This season',
      imageUrl: STOCK_IMAGES[5],
    },
  ];
}

export function stockAnnouncementImage(index: number): string {
  return STOCK_IMAGES[index % STOCK_IMAGES.length];
}

/** Keeps custom items first; fills up to six from defaults when fewer are saved. */
export function ensureAnnouncementCarousel(
  announcements: LandingAnnouncement[],
): LandingAnnouncement[] {
  const current = announcements.filter((a) => a.title?.trim());
  if (current.length >= ANNOUNCEMENT_CAROUSEL_COUNT) {
    return current.slice(0, 12);
  }
  const defaults = buildDefaultAnnouncements();
  const merged: LandingAnnouncement[] = [...current];
  for (let i = merged.length; i < ANNOUNCEMENT_CAROUSEL_COUNT; i++) {
    const fill = defaults[i];
    merged.push({
      ...fill,
      id: fill.id ?? slideId(i + 1),
    });
  }
  return merged;
}
