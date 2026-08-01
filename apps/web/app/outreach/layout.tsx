import type { Metadata } from 'next';

/**
 * Public outreach capture (QR / NFC) — browser form only.
 * Do not advertise as an installable app on these routes.
 */
export const metadata: Metadata = {
  title: 'Outreach registration',
  description: 'Quick web registration — no app install required.',
  appleWebApp: {
    capable: false,
  },
  // Prefer browser tab over mini-app chrome when scanning in the field.
  other: {
    'mobile-web-app-capable': 'no',
  },
};

export default function OutreachPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
