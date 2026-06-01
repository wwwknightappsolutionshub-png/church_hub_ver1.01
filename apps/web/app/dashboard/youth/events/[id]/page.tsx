import { YouthEventDetailPanel } from '@/components/youth/events/YouthEventDetailPanel';

export default function YouthEventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <YouthEventDetailPanel eventId={params.id} />;
}
