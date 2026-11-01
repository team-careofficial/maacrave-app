import { router, useLocalSearchParams } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API, type SignInTarget } from '@/api';
import { useAuth } from '@/auth';
import { C, F, R, S } from '@/theme';
import { Button, Header, Row, T } from '@/ui';

const CODE_LIFETIME = 5 * 60; // seconds — matches the server
const RESEND_AFTER = 45;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Verify() {
  const { phone, email } = useLocalSearchParams<{ phone?: string; email?: string }>();
  const target: SignInTarget = email ? { email } : { phone: phone || '' };
  const shownTo = email ? email : `+88 ${phone}`;
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<TextInput>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = Math.floor((now - sentAt) / 1000);
  const left = Math.max(0, CODE_LIFETIME - elapsed);
  const resendIn = Math.max(0, RESEND_AFTER - elapsed);
  const expired = left === 0;

  async function verify(c = code) {
    if (expired) return setError('This code has expired. Tap “Send a new code”.');
    if (c.length !== 6) return setError('Enter all 6 digits.');
    setBusy(true); setError(null);
    try { await signIn(await API.verifyOtp(target, c)); }
    catch (e) { setError((e as Error).message); setCode(''); }
    finally { setBusy(false); }
  }
  async function resend() {
    try { await API.requestOtp(target); setSentAt(Date.now()); setNow(Date.now()); setCode(''); setError(null); ref.current?.focus(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="" back />
      <View style={{ padding: S.xl, gap: S.xxl, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
        <View style={{ gap: S.sm }}>
          <T v="hero">Enter the code</T>
          <T v="sub">We sent a 6-digit code {email ? 'by email' : 'by SMS'} to <T v="label" color={C.text}>{shownTo}</T></T>
        </View>

        <Row gap={8} style={{ alignSelf: 'flex-start', backgroundColor: expired ? C.errSoft : left <= 60 ? C.warnSoft : C.brandSoft, borderRadius: R.pill, paddingHorizontal: 14, height: 34 }}>
          <Clock size={15} color={expired ? C.err : left <= 60 ? C.warn : C.brandText} />
          <T v="label" color={expired ? C.err : left <= 60 ? C.warn : C.brandText}>{expired ? 'Code expired' : `Code expires in ${mmss(left)}`}</T>
        </Row>

        <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', gap: S.sm, opacity: expired ? 0.5 : 1 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 62, borderRadius: 16, borderWidth: 1.5, backgroundColor: code[i] ? C.surface : C.surface2, borderColor: i === code.length ? C.brand : error ? C.err : code[i] ? C.line2 : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <T v="title" style={{ fontFamily: F.display }}>{code[i] || ''}</T>
            </View>
          ))}
        </Pressable>
        <TextInput ref={ref} value={code} autoFocus keyboardType="number-pad" textContentType="oneTimeCode" autoComplete={email ? 'one-time-code' : 'sms-otp'} maxLength={6} editable={!expired}
          onChangeText={(t) => { const v = t.replace(/\D/g, ''); setCode(v); setError(null); if (v.length === 6) verify(v); }}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} />
        {error ? <T v="meta" color={C.err}>{error}</T> : null}

        {expired ? <Button title="Send a new code" size="lg" onPress={resend} /> : <Button title="Verify" size="lg" onPress={() => verify()} loading={busy} />}
        {!expired ? (
          <Pressable disabled={resendIn > 0} onPress={resend}><T v="label" center color={resendIn ? C.muted : C.brandText}>{resendIn ? `Resend code in ${resendIn}s` : 'Resend code'}</T></Pressable>
        ) : null}
        {email ? <T v="meta" center>Can’t find it? Check your Spam or Promotions folder.</T> : null}
        <Pressable onPress={() => router.back()}><T v="meta" center>{email ? 'Wrong email? Change it' : 'Wrong number? Change it'}</T></Pressable>
      </View>
    </SafeAreaView>
  );
}
