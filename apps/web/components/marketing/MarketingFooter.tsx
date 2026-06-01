import Link from 'next/link';
import { BrandMark } from '@/components/brand/BrandMark';

const footerLinks = {
  Product: [
    { label: 'Platform', href: '#platform' },
    { label: 'Modules', href: '#modules' },
    { label: 'Security', href: '#security' },
    { label: 'Demo', href: '/dashboard' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandMark showTagline />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Enterprise church community management — membership, discipleship, evangelism,
              and every ministry in one secure platform.
            </p>
          </div>
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="text-sm font-semibold">{group}</p>
              <ul className="mt-3 space-y-2">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Church_Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
