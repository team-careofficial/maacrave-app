import { Redirect } from 'expo-router';
import { useAuth } from '@/auth';
import { COOK_TERMS } from '@/legal/content';
import { LegalPage } from '@/ui/legal';

/** Partner terms are only for approved cooks; everyone else is sent home. */
export default function CookTermsPage() {
  const { status, canUse } = useAuth();
  if (status === 'loading') return null;
  if (!canUse('COOK')) return <Redirect href="/" />;
  return <LegalPage doc={COOK_TERMS} />;
}
