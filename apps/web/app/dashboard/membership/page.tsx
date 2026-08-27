import { redirect } from 'next/navigation';

export default function CongregantsHubPage({
  searchParams,
}: {
  searchParams?: { add?: string };
}) {
  const qs = searchParams?.add === '1' ? '?add=1' : '';
  redirect(`/dashboard/membership/members${qs}`);
}
