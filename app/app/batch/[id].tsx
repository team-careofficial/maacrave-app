import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Clock, ShieldCheck, Truck, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { clock, countdown, day, tk } from '@/format';
import { useMeta } from '@/hooks';
import { C, S } from '@/theme';
import { Avatar, Badge, Button, Card, CategoryTile, Divider, ErrorState, Header, KV, Loading, Meter, Note, Row, Screen, Section, Stepper, T } from '@/ui';

export default function BatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['batch', id], queryFn: () => API.batch(id), refetchInterval: 30_000 });
  const meta = useMeta();
  const [qty, setQty] = useState(1);
  const b = q.data;
  const open = !!b && b.status === 'OPEN' && new Date(b.cutoffAt) > new Date();
  const left = b ? Math.max(0, b.maxPortions - b.filled) : 0;
  const saving = meta.data ? meta.data.fees.deliveryFee - meta.data.fees.batchDeliveryFee : 0;

  return (
    <Screen header={<Header back title="Group order" sub={b?.cook?.displayName} />} onRefresh={q.refetch}
      footer={b && open && !b.myOrderId && left > 0 ? (
        <>
          <Stepper value={qty} onChange={setQty} max={Math.min(left, 10)} />
          <Button size="lg" style={{ flex: 1 }} title={`Join · ${tk(b.pricePerPortion * qty)}`}
            onPress={() => router.push({ pathname: '/checkout', params: { kind: 'batch', batchId: b.id, quantity: String(qty) } })} />
        </>
      ) : b?.myOrderId ? <Button size="lg" full style={{ flex: 1 }} v="dark" title="View my order" onPress={() => router.push(`/order/${b.myOrderId}`)} /> : undefined}>
      {q.isLoading ? <Loading /> : q.error || !b ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <View style={{ gap: S.lg }}>
          <Row style={{ alignItems: 'flex-start', gap: S.lg, marginTop: S.sm }}>
            <CategoryTile category={b.dish?.category || 'lunch'} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="title">{b.title}</T>
              <Row gap={4}><T v="sub">{b.cook?.displayName} · {b.area}</T><BadgeCheck size={14} color={C.brand} /></Row>
              <Row gap={6} style={{ marginTop: 4 }}>
                {b.myOrderId ? <Badge tone="ok" label={`You joined · ${b.myPortions} portion${b.myPortions > 1 ? 's' : ''}`} /> : null}
                {!open ? <Badge label={b.status === 'FAILED' ? 'Didn’t fill' : b.status.charAt(0) + b.status.slice(1).toLowerCase()} tone={b.status === 'FAILED' ? 'err' : 'neutral'} /> : null}
              </Row>
            </View>
          </Row>

          <Card style={{ gap: S.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="big">{tk(b.pricePerPortion)}<T v="meta"> / portion</T></T>
              {open ? <Row gap={4}><Clock size={15} color={C.brandText} /><T v="label" color={C.brandText}>Closes in {countdown(b.cutoffAt)}</T></Row> : null}
            </Row>
            <Meter value={b.filled} max={b.maxPortions} ok={b.filled >= b.minPortions} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="sub"><T v="label">{b.filled}</T> of {b.maxPortions} portions · {b.participants} neighbour{b.participants === 1 ? '' : 's'}</T>
              <T v="meta">{b.filled >= b.minPortions ? 'Confirmed to cook' : `${b.minPortions - b.filled} more needed`}</T>
            </Row>
            <Divider />
            <KV k="Ready by" v={`${day(b.readyBy)}, ${clock(b.readyBy)}`} />
            <KV k="Orders close" v={`${day(b.cutoffAt)}, ${clock(b.cutoffAt)}`} />
            {saving > 0 ? <KV k="Delivery" v={`${tk(meta.data!.fees.batchDeliveryFee)} (save ${tk(saving)})`} color={C.ok} /> : null}
          </Card>

          <Section title="How group orders work" style={{ marginTop: S.sm }}>
            <View style={{ gap: S.md }}>
              {[
                { Icon: Users, t: 'Join with your portions', s: 'Neighbours order the same dish from one kitchen.' },
                { Icon: ShieldCheck, t: 'Cooking starts at the minimum', s: `If ${b.minPortions} portions aren’t reached by the cut-off, everyone is refunded in full.` },
                { Icon: Truck, t: 'One rider, cheaper delivery', s: 'A single rider drops every order on the route.' },
              ].map(({ Icon, t, s }) => (
                <Row key={t} style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={C.brandText} /></View>
                  <View style={{ flex: 1 }}><T v="label">{t}</T><T v="sub">{s}</T></View>
                </Row>
              ))}
            </View>
          </Section>

          {b.who?.length ? (
            <Section title="Who’s in" style={{ marginTop: S.sm }}>
              <Row gap={S.md} wrap>
                {b.who.map((w, i) => (
                  <Row key={i} gap={8}><Avatar name={w.name} size={32} color={w.name === 'You' ? C.ok : C.brand} /><T v="sub">{w.name} · {w.portions}</T></Row>
                ))}
              </Row>
            </Section>
          ) : null}
          {open && left === 0 ? <Note>This group is full. Check the kitchen for other open batches.</Note> : null}
        </View>
      )}
    </Screen>
  );
}
