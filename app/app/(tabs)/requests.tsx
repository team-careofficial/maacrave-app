import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, Clock, MessageSquare, Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { ago, clock, day, tk } from '@/format';
import { C, F, ON_GLOSS, ON_GLOSS_SOFT, R, S } from '@/theme';
import type { FoodRequest, Proposal } from '@/types';
import { Badge, Button, Card, Glossy, Rings, CategoryTile, confirm, Divider, Empty, ErrorState, Header, Loading, Rating, Row, Screen, Section, Segmented, T, useToast, Chip } from '@/ui';
import { Grid } from '@/ui/grid';

const STATUS: Record<FoodRequest['status'], { label: string; tone: 'brand' | 'ok' | 'warn' | 'neutral' | 'err' }> = {
  OPEN: { label: 'Waiting for cooks', tone: 'warn' }, PROPOSALS: { label: 'Prices received', tone: 'brand' }, ACCEPTED: { label: 'Accepted', tone: 'ok' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' }, EXPIRED: { label: 'Expired', tone: 'neutral' },
};

function ProposalRow({ r, p }: { r: FoodRequest; p: Proposal }) {
  const qc = useQueryClient();
  const toast = useToast();
  const decline = useMutation({ mutationFn: () => API.declineProposal(r.id, p.id), onSuccess: (d) => { qc.setQueryData(['requests'], d); toast('Proposal declined'); } });
  const accept = () => router.push({ pathname: '/checkout', params: { kind: 'request', requestId: r.id, proposalId: p.id, allowGroup: r.allowGroup ? '1' : '0' } });
  return (
    <View style={{ gap: S.sm, paddingVertical: S.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <T v="label">{p.cook.displayName}</T>
          <Row gap={6} style={{ marginTop: 2 }}><Rating value={p.cook.rating} count={p.cook.ratingCount} /><T v="meta">· {p.cook.area}</T></Row>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="price">{tk(p.pricePerPortion)}</T>
          <T v="meta">per portion · {tk(p.pricePerPortion * r.portions)} total</T>
        </View>
      </Row>
      {p.note ? <T v="sub" color={C.text2}>“{p.note}”</T> : null}
      <Row gap={S.sm}>
        <Button title="Accept & pay" size="sm" onPress={accept} icon={<Check size={16} color="#fff" />} style={{ flex: 1 }} />
        <Button title="Decline" size="sm" v="outline" loading={decline.isPending} onPress={() => decline.mutate()} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

function RequestCard({ r }: { r: FoodRequest }) {
  const qc = useQueryClient();
  const toast = useToast();
  const st = STATUS[r.status];
  const pending = r.proposals.filter((p) => p.status === 'PENDING');
  const cancel = useMutation({ mutationFn: () => API.cancelRequest(r.id), onSuccess: (d) => { qc.setQueryData(['requests'], d); toast('Request cancelled'); } });
  const live = r.status === 'OPEN' || r.status === 'PROPOSALS';
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <CategoryTile category={r.category} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="card">{r.dishName}</T>
          <T v="meta">{r.portions} portion{r.portions > 1 ? 's' : ''} · up to {tk(r.budgetPerPortion)} each · {r.area}</T>
          <Row gap={6} style={{ marginTop: 6 }} wrap>
            <Badge label={st.label} tone={st.tone} />
            {r.allowGroup ? <Badge label="Group OK" icon={<Users size={12} color={C.text2} />} /> : null}
          </Row>
        </View>
      </Row>
      <Row gap={6}><Clock size={14} color={C.muted} /><T v="meta">Needed {day(r.neededAt)}, {clock(r.neededAt)} · posted {ago(r.createdAt)}</T></Row>
      {pending.length ? (
        <View>
          <Divider />
          {pending.map((p, i) => <View key={p.id}>{i ? <Divider /> : null}<ProposalRow r={r} p={p} /></View>)}
        </View>
      ) : null}
      {r.order ? <Button title={`View order ${r.order.code}`} v="secondary" size="sm" onPress={() => router.push(`/order/${r.order!.id}`)} /> : null}
      {live ? (
        <Button title="Cancel request" v="ghost" size="sm" loading={cancel.isPending}
          onPress={async () => { if (await confirm('Cancel this request?', 'Cooks will stop sending prices for it.', 'Cancel request', true)) cancel.mutate(); }} />
      ) : null}
    </Card>
  );
}

export default function Requests() {
  const [tab, setTab] = useState<'open' | 'past'>('open');
  const q = useQuery({ queryKey: ['requests'], queryFn: API.requests });
  const open = (q.data || []).filter((r) => r.status === 'OPEN' || r.status === 'PROPOSALS');
  const past = (q.data || []).filter((r) => !(r.status === 'OPEN' || r.status === 'PROPOSALS'));
  const list = tab === 'open' ? open : past;

  return (
    <Screen header={<Header title="Request a dish" sub="Can’t find it? Mothers cook it for you." />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Glossy style={{ marginTop: S.sm }}>
        <View style={{ padding: S.xl, gap: S.lg }}>
          <Rings size={260} right={-90} top={-80} />
          <View style={{ gap: 6, maxWidth: 520 }}>
            <T v="eyebrow" color={ON_GLOSS_SOFT}>Made to order</T>
            <T v="title" color={ON_GLOSS} style={{ fontSize: 28, lineHeight: 32 }}>What are you craving?</T>
            <T v="sub" color={ON_GLOSS_SOFT}>Describe the dish, portions and budget. Verified mothers nearby reply with a price — you choose who cooks.</T>
          </View>
          <Row gap={S.sm} wrap>
            {['Describe it', 'Get prices', 'Pick a cook'].map((st, i) => (
              <Row key={st} gap={8} style={{ backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: R.pill, paddingLeft: 4, paddingRight: 12, height: 32 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><T v="meta" color={C.brand} style={{ fontFamily: F.bold }}>{i + 1}</T></View>
                <T v="meta" color={ON_GLOSS} style={{ fontFamily: F.semibold }}>{st}</T>
              </Row>
            ))}
          </Row>
          <Button title="Start a request" v="light" icon={<Plus size={18} color={C.brandText} />} onPress={() => router.push('/request/new')} style={{ alignSelf: 'flex-start' }} />
        </View>
      </Glossy>

      <Section title="Your requests">
        <Segmented value={tab} onChange={setTab} items={[{ key: 'open', label: `Open${open.length ? ` (${open.length})` : ''}` }, { key: 'past', label: 'Past' }]} />
        {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : list.length ? (
          <Grid max={2}>{list.map((r) => <RequestCard key={r.id} r={r} />)}</Grid>
        ) : (
          <Empty Icon={MessageSquare} title={tab === 'open' ? 'No open requests' : 'No past requests'}
            text={tab === 'open' ? 'Ask for anything — shorshe ilish, khichuri, a birthday payesh. Mothers nearby will reply.' : 'Requests you finish or cancel will appear here.'}
            action={tab === 'open' ? 'Start a request' : undefined} onAction={() => router.push('/request/new')} />
        )}
      </Section>

      <Section title="Popular to request">
        <Row gap={S.sm} wrap>
          {['Shorshe ilish', 'Beef tehari', 'Khichuri & beguni', 'Chicken roast', 'Payesh', 'Shutki bhorta'].map((s) => (
            <Chip key={s} label={s} onPress={() => router.push({ pathname: '/request/new', params: { dish: s } })} />
          ))}
        </Row>
      </Section>
    </Screen>
  );
}
