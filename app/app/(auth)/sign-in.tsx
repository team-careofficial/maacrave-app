import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BadgeCheck, Bike, HeartHandshake, Mail, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '@/api';
import { BD_PHONE, normalizePhone } from '@/format';
import { C, GLOSS, R, S, SHEEN } from '@/theme';
import { Button, FadeIn, Input, Rings, Row, Segmented, T } from '@/ui';
import { Brand } from '@/ui/brand';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const PERKS = [
  { Icon: BadgeCheck, t: 'Verified home kitchens' },
  { Icon: HeartHandshake, t: 'Request any dish' },
  { Icon: Bike, t: 'Delivered hot' },
];

export default function SignIn() {
  const insets = useSafeAreaInsets();
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

  return (
    <View style={{ flex: 1, backgroundColor: C.brandDark }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={{ paddingTop: insets.top + S.xl, paddingHorizontal: S.xl, paddingBottom: 64, overflow: 'hidden' }}>
            <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%' }} />
            <Rings size={320} right={-110} top={-60} />
            <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: S.x3 }}>
              <Brand light />
              <FadeIn style={{ gap: S.md }}>
                <T v="hero" color="#fff" style={{ fontSize: 38, lineHeight: 42 }}>Ghorer khabar,{'\n'}mayer haater.</T>
                <T v="body" color="rgba(255,255,255,0.86)">Fresh homemade meals from verified mothers in your neighbourhood.</T>
              </FadeIn>
              <Row gap={S.sm} wrap>
                {PERKS.map(({ Icon, t }) => (
                  <Row key={t} gap={6} style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: R.pill, paddingHorizontal: 12, height: 32 }}>
                    <Icon size={14} color="#fff" /><T v="meta" color="#fff">{t}</T>
                  </Row>
                ))}
              </Row>
            </View>
          </View>

          <View style={{ flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, paddingHorizontal: S.xl, paddingTop: S.x3, paddingBottom: insets.bottom + S.xl }}>
            <FadeIn delay={120} style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: S.xl }}>
              <View style={{ gap: 4 }}>
                <T v="title">Sign in or sign up</T>
                <T v="sub">No passwords. We’ll send you a 6-digit code that works for 5 minutes.</T>
              </View>
              <Segmented value={mode} onChange={(m) => { setMode(m); setError(null); }}
                items={[{ key: 'phone', label: 'Mobile number' }, { key: 'email', label: 'Gmail / Email' }]} />
              {mode === 'phone' ? (
                <Input key="phone" label="Mobile number" prefix="+880" keyboardType="phone-pad" autoComplete="tel" placeholder="1712 345678" value={phone}
                  onChangeText={(t) => { setPhone(t); setError(null); }} error={error} hint="Code comes by SMS." onSubmitEditing={next} returnKeyType="next" maxLength={14} />
              ) : (
                <Input key="email" label="Email address" keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} placeholder="name@gmail.com" value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }} error={error} hint="Code comes to your inbox. Check Spam if you don’t see it." onSubmitEditing={next} returnKeyType="next" maxLength={120} />
              )}
              <Button title="Send code" size="lg" onPress={next} loading={busy} icon={mode === 'phone' ? <Smartphone size={18} color="#fff" /> : <Mail size={18} color="#fff" />} />
              <T v="meta" center>By continuing you agree to MaaCrave’s Terms of Service and Privacy Policy.</T>
            </FadeIn>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
