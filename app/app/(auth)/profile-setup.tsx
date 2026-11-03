import { useQuery } from '@tanstack/react-query';
import { Bike, Check, ChefHat, ShoppingBag, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '@/api';
import { onboarding, useAuth } from '@/auth';
import { BD_PHONE, normalizePhone } from '@/format';
import { C, R, S } from '@/theme';
import { Button, Chip, FadeIn, Field, Input, Row, T, Tap } from '@/ui';
import { Logo } from '@/ui/brand';

type Goal = 'eat' | 'cook' | 'rider';
const GOALS: { key: Goal; Icon: LucideIcon; title: string; bn: string; sub: string }[] = [
  { key: 'eat', Icon: ShoppingBag, title: 'Order food', bn: 'খাবার অর্ডার করব', sub: 'Homemade meals and requests from mothers nearby' },
  { key: 'cook', Icon: ChefHat, title: 'Cook & sell', bn: 'ঘরে রান্না করে বিক্রি করব', sub: 'For mothers and home cooks — verified by our team' },
  { key: 'rider', Icon: Bike, title: 'Deliver food', bn: 'খাবার ডেলিভারি করব', sub: 'Flexible earnings — verified by our team' },
];

/** First-time setup: what the person wants to do on MaaCrave, then name, area and contact. */
export default function ProfileSetup() {
  const { reload, me } = useAuth();
  const needsPhone = !me?.phone;
  const meta = useQuery({ queryKey: ['meta'], queryFn: API.meta });
  const [step, setStep] = useState<0 | 1>(0);
  const [goal, setGoal] = useState<Goal>('eat');
  const [name, setName] = useState(me?.name || '');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState<string | null>(me?.area || null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (name.trim().length < 2) return setError('Please enter your full name.');
    if (needsPhone && !BD_PHONE.test(normalizePhone(phone))) return setError('Add a mobile number so riders and cooks can reach you.');
    if (!area) return setError('Choose your area so we can show kitchens near you.');
    setBusy(true); setError(null);
    try {
      await API.updateMe({ name: name.trim(), area, ...(needsPhone ? { phone: normalizePhone(phone) } : {}) });
      onboarding.next = goal === 'eat' ? null : goal;
      await reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: S.x5 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: S.xxl }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Logo size={44} />
            <Row gap={6}>{[0, 1].map((i) => <View key={i} style={{ width: i === step ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? C.brand : C.line2 }} />)}</Row>
          </Row>

          {step === 0 ? (
            <FadeIn key="goal" style={{ gap: S.xl }}>
              <View style={{ gap: S.sm }}>
                <T v="hero">How will you use MaaCrave?</T>
                <T v="sub">You can always order food. Cooks and riders are verified by our team before they start.</T>
              </View>
              <View style={{ gap: S.md }}>
                {GOALS.map(({ key, Icon, title, bn, sub }) => {
                  const on = goal === key;
                  return (
                    <Tap key={key} role="radio" onPress={() => setGoal(key)} scale={0.98}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: R.lg, borderWidth: 2, borderColor: on ? C.brand : 'transparent', backgroundColor: on ? C.brandSoft : C.card }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: on ? C.brand : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={24} color={on ? '#fff' : C.brand} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T v="card">{title}</T>
                        <T v="sub" bn color={C.text2}>{bn}</T>
                        <T v="meta">{sub}</T>
                      </View>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.brand : C.line2, backgroundColor: on ? C.brand : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                        {on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                      </View>
                    </Tap>
                  );
                })}
              </View>
              <Button title="Continue" size="lg" onPress={() => setStep(1)} />
            </FadeIn>
          ) : (
            <FadeIn key="details" style={{ gap: S.xl }}>
              <View style={{ gap: S.sm }}>
                <T v="hero">About you</T>
                <T v="sub">{goal === 'eat' ? 'So we can show kitchens near you.' : `Next you’ll fill a short ${goal === 'cook' ? 'cook' : 'rider'} application with your NID.`}</T>
              </View>
              <Input label="Full name" placeholder="e.g. Tanvir Rahman" autoComplete="name" value={name} onChangeText={(t) => { setName(t); setError(null); }} />
              {needsPhone ? (
                <Input label="Mobile number" prefix="🇧🇩 +880" keyboardType="phone-pad" autoComplete="tel" placeholder="1712 345678" value={phone} maxLength={14}
                  hint="Used only for delivery calls and important account messages." onChangeText={(t) => { setPhone(t); setError(null); }} />
              ) : null}
              <Field label="Your area">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                  {(meta.data?.areas || []).map((a) => <Chip key={a} label={a} on={area === a} onPress={() => { setArea(a); setError(null); }} />)}
                </View>
              </Field>
              {error ? <T v="meta" color={C.err}>{error}</T> : null}
              <Row gap={S.md}>
                <Button title="Back" v="outline" size="lg" onPress={() => setStep(0)} />
                <Button title={goal === 'eat' ? 'Get started' : 'Continue to application'} size="lg" onPress={save} loading={busy} style={{ flex: 1 }} />
              </Row>
            </FadeIn>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
