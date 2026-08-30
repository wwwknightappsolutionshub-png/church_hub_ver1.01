import type { Metadata } from 'next';
import { DemoTourLauncher } from '@/components/demo/DemoTourLauncher';

export const metadata: Metadata = {
  title: 'Product tour | Church Hub',
  description:
    'Watch an illustrated walkthrough of Church Hub — signup, login, and leadership admin tools (mockup preview).',
};

export default function DemoTourPage() {
  return <DemoTourLauncher />;
}
