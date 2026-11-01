import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth';
import { C } from '@/theme';

/** Rider mode is only reachable for approved riders. The API enforces this too. */
export default function RiderLayout() {
  const { status, canUse } = useAuth();
  if (status === 'ready' && !canUse('RIDER')) return <Redirect href="/account" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
