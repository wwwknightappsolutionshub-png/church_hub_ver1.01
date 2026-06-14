import { redirect } from 'next/navigation';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';

export default function AddFamilyRedirectPage() {
  redirect(`${CONGREGANTS_ROUTES.families}?add=1`);
}
