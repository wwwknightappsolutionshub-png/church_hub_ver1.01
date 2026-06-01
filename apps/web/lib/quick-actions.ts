import { Bus, HeartHandshake, Layers, Megaphone, Users, type LucideIcon } from 'lucide-react';

export interface QuickActionItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const DASHBOARD_QUICK_ACTIONS: QuickActionItem[] = [
  { label: 'Add Member', href: '/dashboard/membership?add=1', icon: Users },
  { label: 'Capture Outreach', href: '/dashboard/outreach', icon: Megaphone },
  { label: 'Follow-Up Queue', href: '/dashboard/follow-up', icon: HeartHandshake },
  { label: 'Service Units', href: '/dashboard/service-units', icon: Layers },
  { label: 'Schedule Ride', href: '/dashboard/bus', icon: Bus },
];
