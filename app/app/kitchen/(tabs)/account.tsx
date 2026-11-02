import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { C, R, S } from '@/theme';
import { Avatar, Button, Card, confirm, ErrorState, Field, Header, Input, Loading, Row, Screen, Section, Stepper, T, useToast } from '@/ui';
import { ModeSwitch } from '@/ui/mode';
import { PinPicker } from '@/ui/map';
import { AREA_COORDS, DHAKA, type Point } from '@/geo';

const CHECKS = ['Clean cooking area and utensils', 'Safe drinking water for cooking', 'Fridge for raw meat and fish', 'Hair covered and hands washed while cooking', 'Food packed in sealed, food-grade boxes'];

export default function KitchenSettings() {
  const { canUse, signOut } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['kitchen'], queryFn: API.kitchen });
  const k = q.data?.kitchen;
  const [intro, setIntro] = useState('');
  const [hours, setHours] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [wallet, setWallet] = useState('');
  const [checks, setChecks] = useState(0);
  const [pin, setPin] = useState<Point | null>(null);
  useEffect(() => { if (k) { setIntro(k.intro || ''); setHours(k.hours || ''); setCapacity(k.dailyCapacity); setWallet(k.payoutWallet || ''); setChecks(k.hygieneChecks); } }, [k]);
  const save = useMutation({
    mutationFn: () => API.updateKitchen({ intro: intro.trim(), hours: hours.trim(), dailyCapacity: capacity, payoutWallet: wallet.trim() || undefined, hygieneChecks: checks, ...(pin ? { lat: pin.lat, lng: pin.lng } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen'] }); toast('Kitchen saved'); }, onError: (e) => toast((e as Error).message),
  });

  return (
    <Screen header={<Header title="Kitchen" right={k ? <Button title="Save changes" size="sm" loading={save.isPending} onPress={() => save.mutate()} /> : undefined} />}>
      {q.isLoading ? <Loading /> : q.error || !k ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Card white style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm }}>
            <Avatar name={k.displayName} size={52} />
            <View style={{ flex: 1 }}><T v="card">{k.displayName}</T><T v="meta">{k.area} · {k.completedOrders} orders · {k.rating ? `${k.rating.toFixed(1)}★` : 'New'}</T></View>
            <Button title="View" size="sm" v="ghost" onPress={() => router.push(`/cook/${k.id}`)} />
          </Card>

          <Section title="Profile">
            <View style={{ gap: S.lg }}>
              <Input label="About your kitchen" value={intro} onChangeText={setIntro} maxLength={300} multiline placeholder="Tell customers what makes your cooking special" style={{ minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 }} />
              <Input label="Cooking hours" value={hours} onChangeText={setHours} maxLength={30} placeholder="11am – 9pm" />
              <Field label="Portions you can cook a day"><Row style={{ justifyContent: 'space-between' }}><T v="sub">{capacity} portions</T><Stepper value={capacity} onChange={setCapacity} min={1} max={300} large /></Row></Field>
            </View>
          </Section>

          <Section title="Kitchen location" sub="Customers see the route from here when they order. Drag the map to put the pin on your kitchen.">
            <PinPicker center={k.lat != null && k.lng != null ? { lat: k.lat, lng: k.lng } : AREA_COORDS[k.area] || DHAKA} onChange={setPin} />
          </Section>

          <Section title="Hygiene checklist" sub={`${checks} of 5 — shown to customers as a trust badge`}>
            <View style={{ gap: S.sm }}>
              {CHECKS.map((c, i) => {
                const on = i < checks;
                return (
                  <Pressable key={c} onPress={() => setChecks(on ? i : i + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: on ? C.ok + '55' : C.line2, backgroundColor: on ? C.okSoft : C.surface }}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: on ? C.ok : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
                    <T v="sub" color={C.text} style={{ flex: 1 }}>{c}</T>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Payouts">
            <Input label="bKash number for payouts" value={wallet} onChangeText={(t) => setWallet(t.replace(/[^\d]/g, '').slice(0, 11))} keyboardType="phone-pad" placeholder="01XXXXXXXXX" />
            <Button title="Earnings & withdrawals" v="outline" icon={<Wallet size={16} color={C.text} />} onPress={() => router.push('/kitchen/earnings')} style={{ alignSelf: 'flex-start' }} />
          </Section>

          <Button title="Save changes" size="lg" loading={save.isPending} onPress={() => save.mutate()} style={{ marginTop: S.xl }} />

          <Section title="Account">
            <Row gap={S.sm} wrap>
              <ModeSwitch to="CUSTOMER" />
              {canUse('RIDER') ? <ModeSwitch to="RIDER" /> : null}
              <Button title="Sign out" v="danger" onPress={async () => { if (await confirm('Sign out?', 'You can sign back in with your phone number.', 'Sign out', true)) signOut(); }} />
            </Row>
          </Section>
        </>
      )}
    </Screen>
  );
}
