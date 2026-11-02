import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BadgeCheck, Bike, HeartHandshake, Mail, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { setLang, useLang } from '@/i18n';
import { BD_PHONE, normalizePhone } from '@/format';
import { C, F, GLOSS, R, S, SHEEN } from '@/theme';
import { Button, FadeIn, Input, Rings, Row, T, Tap } from '@/ui';
import { Brand } from '@/ui/brand';
import { GoogleButton, googleReady } from '@/ui/google';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PERKS = [
  { Icon: BadgeCheck, t: 'Verified home kitchens' },
  { Icon: HeartHandshake, t: 'Request any dish' },
  { Icon: Bike, t: 'Delivered hot' },
];

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const lang = useLang();
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function next() {
    let target: { phone: string } | { email: string };
    if (mode === 'phone') {
      const p = normalizePhone(phone);
      if (!BD_PHONE.test(p)) return setError('Enter a valid Bangladeshi mobile number, e.g. 1712 345678.');
      target = { phone: p };
    } else {
      const e = email.trim().toLowerCase();
      if (!EMAIL.test(e)) return setError('Enter a valid email address, e.g. name@gmail.com.');
      target = { email: e };
    }
    setBusy(true); setError(null);
    try { await API.requestOtp(target); router.push({ pathname: '/verify', params: target }); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const switchTo = (m: 'phone' | 'email') => { setMode(m); setError(null); };

  return (
    <View style={{ flex: 1, backgroundColor: C.brandDark }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={{ paddingTop: insets.top + S.xl, paddingHorizontal: S.xl, paddingBottom: 60, overflow: 'hidden' }}>
            <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%' }} />
            <Rings size={320} right={-110} top={-60} />
            <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: S.xxl }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Brand light />
                <Tap onPress={() => setLang(lang === 'bn' ? 'en' : 'bn')} scale={0.92} style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: R.pill, paddingHorizontal: 14, height: 34, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: lang === 'bn' ? F.bold : F.bnBold, fontSize: 13.5, color: '#fff' }}>{lang === 'bn' ? 'English' : 'বাংলা'}</Text>
                </Tap>
              </Row>
              <FadeIn style={{ gap: S.sm }}>
                <T v="hero" bn color="#fff" style={{ fontFamily: F.bnBold, fontSize: 34, lineHeight: 44 }}>ঘরের খাবার,{'\n'}মায়ের হাতের।</T>
                <T v="body" color="rgba(255,255,255,0.86)">Fresh homemade meals from verified mothers in your neighbourhood.</T>
              </FadeIn>
              <Row gap={S.sm} wrap>
                {PERKS.map(({ Icon, t }) => (
                  <Row key={t} gap={6} style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: R.pill, paddingHorizontal: 12, height: 30 }}>
                    <Icon size={13} color="#fff" /><T v="meta" color="#fff">{t}</T>
                  </Row>
                ))}
              </Row>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, paddingHorizontal: S.xl, paddingTop: S.x3, paddingBottom: insets.bottom + S.xl }}>
            <FadeIn delay={120} style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: S.lg }}>
              <View style={{ gap: 4 }}>
                <T v="title">Welcome</T>
                <T v="sub">Sign in or create an account. No password needed.</T>
              </View>

              {mode === 'phone' ? (
                <Input key="phone" label="Mobile number" prefix="🇧🇩 +880" keyboardType="phone-pad" autoComplete="tel" placeholder="1712 345678" value={phone}
                  onChangeText={(t) => { setPhone(t); setError(null); }} error={error} hint="We’ll text you a 6-digit code. It works for 5 minutes." onSubmitEditing={next} returnKeyType="next" maxLength={14} />
              ) : (
                <Input key="email" label="Email address" keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} placeholder="name@gmail.com" value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }} error={error} hint="We’ll email you a 6-digit code. Check Spam if it doesn’t arrive." onSubmitEditing={next} returnKeyType="next" maxLength={120} />
              )}
              <Button title="Continue" size="lg" onPress={next} loading={busy} />

              <Row gap={S.md} style={{ marginVertical: 2 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: C.line2 }} />
                <T v="meta">or continue with</T>
                <View style={{ flex: 1, height: 1, backgroundColor: C.line2 }} />
              </Row>

              {googleReady ? <GoogleButton onToken={async (t) => { await signIn(await API.googleSignIn(t)); }} onError={setError} /> : null}
              <Tap onPress={() => switchTo(mode === 'phone' ? 'email' : 'phone')} scale={0.97}
                style={{ height: 54, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {mode === 'phone' ? <Mail size={19} color={C.text} /> : <Smartphone size={19} color={C.text} />}
                <Text style={{ fontFamily: F.bold, fontSize: 15.5, color: C.text }}>{mode === 'phone' ? 'Continue with email' : 'Continue with mobile number'}</Text>
              </Tap>

              <T v="meta" center style={{ marginTop: S.sm }}>
                By continuing you agree to MaaCrave’s{' '}
                <Text style={{ color: C.text, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://maacrave.vercel.app/terms')}>Terms</Text> and{' '}
                <Text style={{ color: C.text, textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://maacrave.vercel.app/privacy')}>Privacy Policy</Text>.
              </T>
            </FadeIn>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
