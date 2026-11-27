import type { Metadata } from 'next';
import { ChurchPwaRegister } from '@/components/church-landing/ChurchPwaRegister';

export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: 'default' },
  formatDetection: { telephone: true, email: true },
};

export default function ChurchPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="church-public-root">
      <ChurchPwaRegister />
      {children}
    </div>
  );
}
