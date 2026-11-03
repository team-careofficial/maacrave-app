import { Redirect } from 'expo-router';
import { useAuth } from '@/auth';
import { RIDER_TERMS } from '@/legal/content';
import { LegalPage } from '@/ui/legal';

/** Partner terms are only for approved riders; everyone else is sent home. */
export default function RiderTermsPage() {
  const { status, canUse } = useAuth();
  if (status === 'loading') return null;
  if (!canUse('RIDER')) return <Redirect href="/" />;
  return <LegalPage doc={RIDER_TERMS} />;
}
