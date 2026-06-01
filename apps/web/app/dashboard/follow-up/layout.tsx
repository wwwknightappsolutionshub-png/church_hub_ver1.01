import { FollowUpAccessGate } from '@/components/follow-up/FollowUpAccessGate';

export default function FollowUpLayout({ children }: { children: React.ReactNode }) {
  return <FollowUpAccessGate>{children}</FollowUpAccessGate>;
}
