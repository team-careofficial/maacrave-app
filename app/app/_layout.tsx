import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { HindSiliguri_400Regular, HindSiliguri_600SemiBold } from '@expo-google-fonts/hind-siliguri';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { homeFor, onboarding, useAuth, AuthProvider } from '@/auth';
import { CartProvider } from '@/cart';
import { registerForPush } from '@/push';
import { C } from '@/theme';
import { ToastProvider } from '@/ui';
import { Intro } from '@/ui/intro';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });

function Gate() {
  const { status, mode } = useAuth();
  const segments = useSegments();
  const restored = useRef(false);
  useEffect(() => {
    if (status === 'loading') return;
    SplashScreen.hideAsync().catch(() => undefined);
    const inAuth = segments[0] === '(auth)';
    if (segments[0] === 'payment-result' || segments[1] === 'terms' || segments[1] === 'privacy') return;
    if (status === 'signedOut' && !inAuth) router.replace('/sign-in');
    else if (status === 'needsProfile' && segments[1] !== 'profile-setup') router.replace('/profile-setup');
    else if (status === 'ready' && inAuth) {
      // Someone who chose “cook” or “rider” at sign-up goes straight to that application.
      const next = onboarding.next; onboarding.next = null;
      router.replace(next ? `/apply/${next}` : homeFor(mode));
    }
    else if (status === 'ready' && !restored.current) {
      // Reopen the app in the mode the person last used (cook / rider), once per launch.
      restored.current = true;
      if (mode !== 'CUSTOMER' && segments[0] !== 'kitchen' && segments[0] !== 'rider') router.replace(homeFor(mode));
    }
    if (status === 'signedOut') restored.current = false;
  }, [status, segments, mode]);
  useEffect(() => { if (status === 'ready') registerForPush().catch(() => undefined); }, [status]);
  return null;
}

/** Plays the launch animation until the session is known, then reveals the app. */
function Launch() {
  const { status } = useAuth();
  const [show, setShow] = useState(true);
  useEffect(() => { SplashScreen.hideAsync().catch(() => undefined); }, []);
  if (!show) return null;
  return <><StatusBar style="light" /><Intro ready={status !== 'loading'} onDone={() => setShow(false)} /></>;
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({ BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, HindSiliguri_400Regular, HindSiliguri_600SemiBold });
  if (!loaded && !fontError) return null; // fall back to system fonts rather than a blank screen
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              <Gate />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }} />
              <Launch />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
