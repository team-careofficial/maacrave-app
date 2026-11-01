import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ClipboardList, Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { clock, countdown, tk } from '@/format';
import { C, S } from '@/theme';
import type { KitchenBatch, Order } from '@/types';
import { Badge, Button, Card, confirm, Divider, Empty, ErrorState, Header, Loading, Meter, Row, Screen, Segmented, StatusBadge, T, useToast } from '@/ui';
import { Grid } from '@/ui/grid';

const NEXT: Partial<Record<Order['status'], { action: 'accept' | 'start' | 'ready'; label: string }>> = {
  SUBMITTED: { action: 'accept', label: 'Accept order' }, COOK_ACCEPTED: { action: 'start', label: 'Start cooking' },
  CONFIRMED: { action: 'start', label: 'Start cooking' }, PREPARING: { action: 'ready', label: 'Mark packed & ready' },
};

function KitchenOrder({ o }: { o: Order }) {
  const qc = useQueryClient();
  const toast = useToast();
  const act = useMutation({ mutationFn: (a: 'accept' | 'start' | 'ready' | 'decline') => API.orderAction(o.id, a), onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen'] }); qc.invalidateQueries({ queryKey: ['kitchenOrders'] }); }, onError: (e) => toast((e as Error).message) });
  const next = o.batchId ? undefined : NEXT[o.status];
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><T v="card">{o.code}</T><T v="meta">{o.customer?.name || 'Customer'} · {o.area} · {clock(o.createdAt)}</T></View>
        <StatusBadge status={o.status} />
      </Row>
      <View style={{ gap: 4 }}>{o.items.map((i) => <T key={i.id} v="body">{i.quantity} × {i.name}</T>)}</View>
      {o.notes ? <View style={{ backgroundColor: C.warnSoft, borderRadius: 10, padding: S.md }}><T v="sub" color={C.warn}>Note: {o.notes}</T></View> : null}
      <Divider />
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="sub">You earn <T v="label">{tk(o.cookEarning)}</T></T>
        {o.batch ? <Badge tone="brand" label="Group batch" icon={<Users size={12} color={C.brandText} />} /> : null}
      </Row>
      {next ? (
        <Row gap={S.sm}>
          <Button title={next.label} style={{ flex: 1 }} loading={act.isPending} onPress={() => act.mutate(next.action)} />
          {['SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED'].includes(o.status) ? (
            <Button title="Decline" v="outline" onPress={async () => { if (await confirm('Decline this order?', 'The customer is refunded in full. Declining often lowers your ranking.', 'Decline', true)) act.mutate('decline'); }} />
          ) : null}
        </Row>
      ) : o.batchId && ['CONFIRMED', 'PREPARING', 'SUBMITTED'].includes(o.status) ? <T v="meta">Managed with its group batch.</T> : null}
    </Card>
  );
}

function BatchRow({ b }: { b: KitchenBatch }) {
  const qc = useQueryClient();
  const toast = useToast();
  const act = useMutation({ mutationFn: (a: 'close' | 'confirm' | 'cook' | 'ready' | 'cancel') => API.batchAction(b.id, a), onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchenBatches'] }); qc.invalidateQueries({ queryKey: ['kitchenOrders'] }); toast('Batch updated'); }, onError: (e) => toast((e as Error).message) });
  const reached = b.filled >= b.minPortions;
  const step: { a: 'confirm' | 'cook' | 'ready'; label: string } | null =
    b.status === 'OPEN' || b.status === 'FULL' ? (reached ? { a: 'confirm', label: 'Confirm & lock orders' } : null) : b.status === 'CONFIRMED' ? { a: 'cook', label: 'Start cooking' } : b.status === 'COOKING' ? { a: 'ready', label: 'All packed & ready' } : null;
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><T v="card">{b.title}</T><T v="meta">{tk(b.pricePerPortion)} / portion · ready by {clock(b.readyBy)}</T></View>
        <Badge label={b.status.charAt(0) + b.status.slice(1).toLowerCase()} tone={b.status === 'FAILED' ? 'err' : b.status === 'DONE' ? 'ok' : 'brand'} />
      </Row>
      <Meter value={b.filled} max={b.maxPortions} ok={reached} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="sub">{b.filled}/{b.maxPortions} portions · {b.drops} drop{b.drops === 1 ? '' : 's'}</T>
        <T v="meta">{b.status === 'OPEN' ? `Closes in ${countdown(b.cutoffAt)}` : reached ? 'Minimum reached' : `${b.minPortions - b.filled} to minimum`}</T>
      </Row>
      {['OPEN', 'FULL', 'CONFIRMED', 'COOKING'].includes(b.status) ? (
        <Row gap={S.sm} wrap>
          {step ? <Button title={step.label} size="sm" loading={act.isPending} onPress={() => act.mutate(step.a)} /> : null}
          {b.status === 'OPEN' ? <Button title="Close joining" size="sm" v="outline" onPress={() => act.mutate('close')} /> : null}
          {b.status === 'OPEN' || b.status === 'FULL' ? <Button title="Cancel batch" size="sm" v="ghost" onPress={async () => { if (await confirm('Cancel this batch?', 'Everyone who joined is refunded in full.', 'Cancel batch', true)) act.mutate('cancel'); }} /> : null}
        </Row>
      ) : null}
    </Card>
  );
}

export default function KitchenOrders() {
  const [tab, setTab] = useState<'active' | 'batches' | 'done'>('active');
  const orders = useQuery({ queryKey: ['kitchenOrders', tab], queryFn: () => API.kitchenOrders(tab === 'done' ? 'done' : 'active'), enabled: tab !== 'batches', refetchInterval: 20_000 });
  const batches = useQuery({ queryKey: ['kitchenBatches'], queryFn: API.kitchenBatches, enabled: tab === 'batches' });
  const q = tab === 'batches' ? batches : orders;
  return (
    <Screen header={<Header title="Orders" right={tab === 'batches' ? <Button title="New batch" size="sm" v="secondary" icon={<Plus size={16} color={C.brandText} />} onPress={() => router.push('/kitchen/new-batch')} /> : undefined} />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Segmented value={tab} onChange={setTab} items={[{ key: 'active', label: 'Active' }, { key: 'batches', label: 'Group batches' }, { key: 'done', label: 'Done' }]} />
      <View style={{ marginTop: S.lg }}>
        {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : tab === 'batches' ? (
          batches.data?.length ? <Grid max={2}>{batches.data.map((b) => <BatchRow key={b.id} b={b} />)}</Grid>
            : <Empty Icon={Users} title="No group batches" text="Open a batch for a popular dish — neighbours join, you cook once." action="Open a batch" onAction={() => router.push('/kitchen/new-batch')} />
        ) : orders.data?.length ? <Grid max={2}>{orders.data.map((o) => <KitchenOrder key={o.id} o={o} />)}</Grid>
          : <Empty Icon={ClipboardList} title={tab === 'active' ? 'No active orders' : 'No finished orders yet'} text={tab === 'active' ? 'New orders appear here with a sound alert on your phone.' : 'Delivered orders will be listed here.'} />}
      </View>
    </Screen>
  );
}
