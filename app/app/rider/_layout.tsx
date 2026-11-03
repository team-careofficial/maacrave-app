import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth';
import { useRiderLocation } from '@/riderLocation';
import { C } from '@/theme';

/** Rider mode is only reachable for approved riders. The API enforces this too. */
export default function RiderLayout() {
  const { status, canUse, me } = useAuth();
  useRiderLocation(status === 'ready' && canUse('RIDER') && !!me?.rider?.online);
  if (status === 'ready' && !canUse('RIDER')) return <Redirect href="/account" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}
