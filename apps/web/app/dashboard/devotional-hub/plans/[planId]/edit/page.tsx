import { DevotionalPlanEditor } from '@/components/devotional-hub/DevotionalPlanEditor';

export default function EditDevotionalPlanPage({
  params,
}: {
  params: { planId: string };
}) {
  return <DevotionalPlanEditor planId={params.planId} />;
}
