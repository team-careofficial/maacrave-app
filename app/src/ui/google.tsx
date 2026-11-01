import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, R } from '../theme';
import { Tap } from './index';

WebBrowser.maybeCompleteAuthSession();

const IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};
/** True when a Google OAuth client ID exists for this platform, so the button can be shown. */
export const googleReady = !!(Platform.OS === 'android' ? IDS.androidClientId : Platform.OS === 'ios' ? IDS.iosClientId : IDS.webClientId);

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

/** “Continue with Google”. Hands Google's ID token to `onToken`; the server verifies it with Google. */
export function GoogleButton({ onToken, onError }: { onToken: (idToken: string) => Promise<void>; onError: (msg: string) => void }) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest({ ...IDS, selectAccount: true });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const token = response.params.id_token;
      if (!token) { onError('Google didn’t return an account. Please try again.'); return; }
      setBusy(true);
      onToken(token).catch((e) => onError((e as Error).message)).finally(() => setBusy(false));
    } else if (response.type === 'error') onError('Google sign-in was interrupted. Please try again.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);
  return (
    <Tap onPress={() => prompt()} disabled={!request || busy} scale={0.97}
      style={{ height: 54, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.line2, backgroundColor: C.surface, opacity: request ? 1 : 0.6 }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {busy ? <ActivityIndicator color={C.text} /> : <GoogleG />}
        <Text style={{ fontFamily: F.bold, fontSize: 15.5, color: C.text }}>Continue with Google</Text>
      </View>
    </Tap>
  );
}
