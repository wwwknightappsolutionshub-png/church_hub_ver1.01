import { permanentRedirect } from 'next/navigation';

/** Legacy route — Establishment lives at /dashboard/establishment. */
export default function FollowUpLegacyRedirectPage() {
  permanentRedirect('/dashboard/establishment');
}
