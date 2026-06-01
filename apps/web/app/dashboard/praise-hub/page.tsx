import { redirect } from 'next/navigation';

/** @deprecated Use /dashboard/testimony-hub */
export default function PraiseHubRedirectPage() {
  redirect('/dashboard/testimony-hub');
}
