import { DevotionalGroupDetail } from '@/components/devotional-hub/DevotionalGroupDetail';

export default function DevotionalGroupPage({
  params,
}: {
  params: { groupId: string };
}) {
  return <DevotionalGroupDetail groupId={params.groupId} />;
}
