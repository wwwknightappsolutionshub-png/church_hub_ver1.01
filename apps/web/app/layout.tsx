import type { Metadata, Viewport } from 'next';
import { Anek_Latin, Montserrat } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getSiteUrl } from '@/lib/site-url';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-montserrat',
});

const anek = Anek_Latin({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-anek',
});

const siteUrl = getSiteUrl();
const title = 'Church_Hub — Enterprise Church Management Platform';
const description =
  'Unified platform for membership, discipleship, evangelism, youth ministry, business community, and bus operations — built for churches.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s · Church_Hub',
  },
  description,
  applicationName: 'Church_Hub',
  keywords: [
    'church management software',
    'church membership system',
    'discipleship follow-up',
    'evangelism CRM',
    'church PWA',
    'ministry platform',
  ],
  authors: [{ name: 'Church_Hub' }],
  creator: 'Church_Hub',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Church_Hub' },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Church_Hub',
    title,
    description,
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Church_Hub — Enterprise church management platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/images/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  themeColor: '#312e81',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** App uses client providers (theme, react-query); avoid broken SSG prerender at build time. */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${montserrat.variable} ${anek.variable}`}>
      <body className="font-sans antialiased overscroll-none">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
