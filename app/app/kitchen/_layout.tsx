import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth';
import { C } from '@/theme';

/** Cook mode is only reachable for accounts the MaaCrave team has approved as cooks. The API enforces this too. */
export default function KitchenLayout() {
  const { status, canUse } = useAuth();
  if (status === 'ready' && !canUse('COOK')) return <Redirect href="/account" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
