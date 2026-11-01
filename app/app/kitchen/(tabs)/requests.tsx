import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { ago, clock, day, tk } from '@/format';
import { useMeta } from '@/hooks';
import { C, S } from '@/theme';
import type { FoodRequest } from '@/types';
import { Badge, Button, Card, CategoryTile, Divider, Empty, ErrorState, Header, Input, KV, Loading, Row, Screen, Segmented, T, useToast } from '@/ui';
import { Grid } from '@/ui/grid';

function Incoming({ r }: { r: FoodRequest }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [price, setPrice] = useState(String(r.budgetPerPortion));
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const pct = useMeta().data?.fees.commissionPct ?? 10;
  const done = () => { qc.invalidateQueries({ queryKey: ['kitchenRequests'] }); qc.invalidateQueries({ queryKey: ['kitchenProposals'] }); qc.invalidateQueries({ queryKey: ['kitchen'] }); };
  const propose = useMutation({ mutationFn: () => API.propose(r.id, Number(price), note.trim() || undefined), onSuccess: () => { toast('Price sent to the customer'); done(); }, onError: (e) => toast((e as Error).message) });
  const decline = useMutation({ mutationFn: () => API.declineRequest(r.id), onSuccess: done });
  const p = Number(price) || 0;
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <CategoryTile category={r.category} />
        <View style={{ flex: 1 }}>
          <T v="card">{r.dishName}</T>
          <T v="meta">{r.customer?.name} · {r.area} · {ago(r.createdAt)}</T>
        </View>
        {r.allowGroup ? <Badge label="Group OK" icon={<Users size={12} color={C.text2} />} /> : null}
      </Row>
      <View style={{ gap: 6 }}>
        <KV k="Portions" v={String(r.portions)} />
        <KV k="Budget" v={`up to ${tk(r.budgetPerPortion)} each`} />
        <KV k="Needed" v={`${day(r.neededAt)}, ${clock(r.neededAt)}`} />
        <KV k="Taste" v={`${r.spice} · ${r.oil}${r.diet.length ? ' · ' + r.diet.join(', ') : ''}`} />
        {r.allergies ? <KV k="Allergies" v={r.allergies} color={C.err} /> : null}
        {r.exclusions ? <KV k="Leave out" v={r.exclusions} /> : null}
      </View>
      {r.notes ? <T v="sub" color={C.text2}>“{r.notes}”</T> : null}
      <Divider />
      {open ? (
        <View style={{ gap: S.md }}>
          <Input label="Your price per portion" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" prefix="৳"
            hint={p ? `Customer pays ${tk(p * r.portions)} for food · you receive about ${tk(p * r.portions * (1 - pct / 100))} after ${pct}% commission` : undefined} />
          <Input label="Message (optional)" value={note} onChangeText={setNote} placeholder="e.g. Fresh padma ilish, mustard ground at home" maxLength={140} />
          <Row gap={S.sm}>
            <Button title="Send price" icon={<Send size={16} color="#fff" />} disabled={p < 30} loading={propose.isPending} onPress={() => propose.mutate()} style={{ flex: 1 }} />
            <Button title="Back" v="ghost" onPress={() => setOpen(false)} />
          </Row>
        </View>
      ) : (
        <Row gap={S.sm}>
          <Button title="Make an offer" style={{ flex: 1 }} onPress={() => setOpen(true)} />
          <Button title="Not for me" v="outline" loading={decline.isPending} onPress={() => decline.mutate()} />
        </Row>
      )}
    </Card>
  );
}

export default function KitchenRequests() {
  const [tab, setTab] = useState<'new' | 'sent'>('new');
  const inbox = useQuery({ queryKey: ['kitchenRequests'], queryFn: API.kitchenRequests, refetchInterval: 30_000 });
  const sent = useQuery({ queryKey: ['kitchenProposals'], queryFn: API.kitchenProposals, enabled: tab === 'sent' });
  const q = tab === 'new' ? inbox : sent;
  return (
    <Screen header={<Header title="Requests" sub="Customers near you asking for a dish" />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Segmented value={tab} onChange={setTab} items={[{ key: 'new', label: `New${inbox.data?.length ? ` (${inbox.data.length})` : ''}` }, { key: 'sent', label: 'Prices sent' }]} />
      <View style={{ marginTop: S.lg }}>
        {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : tab === 'new' ? (
          inbox.data?.length ? <Grid max={2}>{inbox.data.map((r) => <Incoming key={r.id} r={r} />)}</Grid>
            : <Empty Icon={MessageSquare} title="No new requests" text="When someone in your area asks for a dish, it shows up here and on your phone." />
        ) : sent.data?.length ? (
          <View style={{ gap: S.sm }}>
            {sent.data.map((p) => (
              <Card key={p.id} style={{ padding: S.md }}>
                <Row>
                  <View style={{ flex: 1 }}><T v="label">{p.request.dishName}</T><T v="meta">{p.request.portions} portions · {tk(p.pricePerPortion)} each</T></View>
                  <Badge label={p.status === 'ACCEPTED' ? 'Accepted' : p.status === 'REJECTED' ? 'Not chosen' : 'Waiting'} tone={p.status === 'ACCEPTED' ? 'ok' : p.status === 'REJECTED' ? 'neutral' : 'warn'} />
                </Row>
              </Card>
            ))}
          </View>
        ) : <Empty Icon={Send} title="No prices sent yet" text="Offers you make to customers are tracked here." />}
      </View>
    </Screen>
  );
}
