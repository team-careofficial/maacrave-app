import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '@/api';
import { BD_PHONE, normalizePhone } from '@/format';
import { useAuth } from '@/auth';
import { C, S } from '@/theme';
import { Button, Chip, Field, Input, T } from '@/ui';
import { Logo } from '@/ui/brand';

export default function ProfileSetup() {
  const { reload, me } = useAuth();
  const needsPhone = !me?.phone;
  const [phone, setPhone] = useState('');
  const meta = useQuery({ queryKey: ['meta'], queryFn: API.meta });
  const [name, setName] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (name.trim().length < 2) return setError('Please enter your full name.');
    if (!area) return setError('Choose your area so we can show kitchens near you.');
    if (needsPhone && !BD_PHONE.test(normalizePhone(phone))) return setError('Add a mobile number so the rider can call you on delivery.');
    setBusy(true);
    try { await API.updateMe({ name: name.trim(), area, ...(needsPhone ? { phone: normalizePhone(phone) } : {}) }); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.xl }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: S.xxl }}>
          <View style={{ gap: S.sm }}>
            <Logo size={52} />
            <T v="hero" style={{ marginTop: S.md }}>Welcome to MaaCrave</T>
            <T v="sub">Tell us your name and where you live. You can change this later.</T>
          </View>
          <Input label="Full name" placeholder="e.g. Tanvir Rahman" autoComplete="name" value={name} onChangeText={(t) => { setName(t); setError(null); }} />
          {needsPhone ? (
            <Input label="Mobile number" prefix="+880" keyboardType="phone-pad" autoComplete="tel" placeholder="1712 345678" value={phone} maxLength={14}
              hint="Only used so the rider can reach you on delivery." onChangeText={(t) => { setPhone(t); setError(null); }} />
          ) : null}
          <Field label="Your area">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
              {(meta.data?.areas || []).map((a) => <Chip key={a} label={a} on={area === a} onPress={() => { setArea(a); setError(null); }} />)}
            </View>
          </Field>
          {error ? <T v="meta" color={C.err}>{error}</T> : null}
          <Button title="Get started" size="lg" onPress={save} loading={busy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
