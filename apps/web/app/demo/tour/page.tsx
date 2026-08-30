import type { Metadata } from 'next';
import { DemoTourLauncher } from '@/components/demo/DemoTourLauncher';

export const metadata: Metadata = {
  title: 'Product tour | Church Hub',
  description:
    'Watch a guided tour of Church Hub — signup, login, and every leadership dashboard module on the live demo church.',
};

export default function DemoTourPage() {
  return <DemoTourLauncher />;
}
