import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, ChefHat, MapPin, Navigation, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { t } from '@/i18n';
import { Linking, Platform, View } from 'react-native';
import { API } from '@/api';
import { tk } from '@/format';
import { C, S } from '@/theme';
import type { RiderOrder } from '@/types';
import { Button, Card, confirm, Divider, Empty, ErrorState, Header, Input, Loading, Row, Screen, StatusBadge, T, useToast } from '@/ui';

const maps = (q: string) => Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${encodeURIComponent(q)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ', Dhaka')}`);

function Drop({ o }: { o: RiderOrder }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [code, setCode] = useState('');
  const deliver = useMutation({ mutationFn: () => API.deliver(o.id, code), onSuccess: (d) => { qc.setQueryData(['riderActive'], d); qc.invalidateQueries({ queryKey: ['riderEarnings'] }); toast('Delivered — nice work!'); }, onError: (e) => toast((e as Error).message) });
  return (
    <View style={{ gap: S.sm }}>
      <Row style={{ justifyContent: 'space-between' }}><T v="label">{o.customer.name} · {o.code}</T><StatusBadge status={o.status} /></Row>
      <T v="sub">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</T>
      {o.addressText ? (
        <Row gap={6} style={{ alignItems: 'flex-start' }}><MapPin size={15} color={C.muted} /><T v="sub" style={{ flex: 1 }}>{o.addressText}</T></Row>
      ) : <T v="meta">Address and phone unlock after pickup · {o.area}</T>}
      {o.cashToCollect ? <Row gap={6}><Banknote size={16} color={C.warn} /><T v="label" color={C.warn}>Collect {tk(o.cashToCollect)} cash</T></Row> : <T v="meta" color={C.ok}>Paid online — nothing to collect</T>}
      {o.addressText ? (
        <Row gap={S.sm} wrap>
          <Button title="Navigate" size="sm" v="outline" icon={<Navigation size={15} color={C.text} />} onPress={() => maps(o.addressText)} />
          {o.customer.phone ? <Button title="Call" size="sm" v="outline" icon={<Phone size={15} color={C.text} />} onPress={() => Linking.openURL(`tel:${o.customer.phone}`)} /> : null}
        </Row>
      ) : null}
      <Button title={t('Message', 'বার্তা')} size="sm" v="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => router.push({ pathname: '/chat/[orderId]', params: { orderId: o.id, code: o.code } })} />
      {o.status === 'ON_THE_WAY' ? (
        <Row gap={S.sm} style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input label="Customer’s 4-digit code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="••••" /></View>
          <Button title="Delivered" v="ok" disabled={code.length !== 4} loading={deliver.isPending} onPress={() => deliver.mutate()} />
        </Row>
      ) : null}
    </View>
  );
}

function Trip({ orders }: { orders: RiderOrder[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = orders[0].groupKey;
  const assigned = orders.some((o) => o.status === 'RIDER_ASSIGNED');
  const picked = orders.some((o) => o.status === 'PICKED_UP');
  const onDone = (d: RiderOrder[]) => qc.setQueryData(['riderActive'], d);
  const pickup = useMutation({ mutationFn: () => API.pickup(key), onSuccess: (d) => { onDone(d); toast('Picked up'); }, onError: (e) => toast((e as Error).message) });
  const start = useMutation({ mutationFn: () => API.startTrip(key), onSuccess: (d) => { onDone(d); toast('Customers notified you’re on the way'); }, onError: (e) => toast((e as Error).message) });
  const release = useMutation({ mutationFn: () => API.riderRelease(orders[0].id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['riderActive'] }); qc.invalidateQueries({ queryKey: ['riderTasks'] }); toast(t('Trip handed back. Another rider will take it.', 'ট্রিপ ফেরত দেওয়া হয়েছে। অন্য রাইডার নেবেন।')); }, onError: (e) => toast((e as Error).message) });
  const cook = orders[0].cook;
  const cash = orders.reduce((a, o) => a + o.cashToCollect, 0);
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <ChefHat size={20} color={C.brandText} />
        <View style={{ flex: 1 }}><T v="card">{cook.displayName}</T><T v="meta">Pickup · {cook.area} · {orders.length} drop{orders.length > 1 ? 's' : ''}{cash ? ` · ${tk(cash)} cash` : ''}</T></View>
        {cook.user?.phone ? <Button title="Call" size="sm" v="ghost" icon={<Phone size={15} color={C.text} />} onPress={() => Linking.openURL(`tel:${cook.user!.phone}`)} /> : null}
      </Row>
      {assigned ? <Button title="Picked up from kitchen" loading={pickup.isPending} onPress={() => pickup.mutate()} /> : null}
      {assigned ? <Button title={t('I can’t make this trip', 'এই ট্রিপ করতে পারব না')} v="ghost" size="sm" loading={release.isPending} onPress={async () => { if (await confirm(t('Hand this trip back?', 'ট্রিপটা ফেরত দেবেন?'), t('Another rider is alerted right away. Doing this often lowers your priority.', 'সাথে সাথে অন্য রাইডারকে জানানো হবে। বারবার করলে আপনার অগ্রাধিকার কমে।'), t('Hand back', 'ফেরত দিন'), true)) release.mutate(); }} /> : null}
      {picked ? <Button title="Start delivery" v="dark" loading={start.isPending} onPress={() => start.mutate()} /> : null}
      {orders.map((o) => <View key={o.id} style={{ gap: S.md }}><Divider /><Drop o={o} /></View>)}
    </Card>
  );
}

export default function RiderTrips() {
  const q = useQuery({ queryKey: ['riderActive'], queryFn: API.riderActive, refetchInterval: 20_000 });
  const groups = new Map<string, RiderOrder[]>();
  for (const o of q.data || []) groups.set(o.groupKey, [...(groups.get(o.groupKey) || []), o]);
  return (
    <Screen header={<Header title="My trips" />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : groups.size ? (
        <View style={{ gap: S.md, marginTop: S.sm }}>{[...groups.values()].map((os) => <Trip key={os[0].groupKey} orders={os} />)}</View>
      ) : <Empty Icon={Navigation} title="No active trips" text="Accept a pickup and it appears here with the route and drop codes." />}
    </Screen>
  );
}
