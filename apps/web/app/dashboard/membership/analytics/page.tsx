import { redirect } from 'next/navigation';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';

export default function CongregantsAnalyticsRedirectPage() {
  redirect(CONGREGANTS_ROUTES.reports);
}
