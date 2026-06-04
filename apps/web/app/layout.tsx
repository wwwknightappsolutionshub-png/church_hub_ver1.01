import type { Metadata, Viewport } from 'next';
import { Anek_Latin, Montserrat } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

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

export const metadata: Metadata = {
  title: 'Church_Hub — Enterprise Church Management Platform',
  description:
    'Unified platform for membership, discipleship, evangelism, youth ministry, business community, and bus operations.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Church_Hub' },
};

export const viewport: Viewport = {
  themeColor: '#3d4fbf',
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
