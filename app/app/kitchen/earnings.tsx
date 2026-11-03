import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { day, tk } from '@/format';
import { C, S } from '@/theme';
import { Badge, Button, Card, Divider, ErrorState, Header, KV, Loading, Note, Row, Screen, Section, T, useToast } from '@/ui';
import { Stat } from '@/ui/bars';

export default function Earnings() {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['earnings'], queryFn: API.earnings });
  const payout = useMutation({ mutationFn: API.requestPayout, onSuccess: () => { qc.invalidateQueries({ queryKey: ['earnings'] }); qc.invalidateQueries({ queryKey: ['kitchen'] }); toast('Withdrawal requested'); }, onError: (e) => toast((e as Error).message) });
  const e = q.data;
  return (
    <Screen header={<Header back title="Earnings" />} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : q.error || !e ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Card style={{ marginTop: S.sm, backgroundColor: C.ink, borderColor: C.ink, gap: S.md }}>
            <T v="meta" color="rgba(255,255,255,0.7)">Available to withdraw</T>
            <T v="big" color="#fff" style={{ fontSize: 34 }}>{tk(e.available)}</T>
            <Button title="Withdraw to bKash" v="primary" icon={<Wallet size={16} color="#fff" />} disabled={e.available < 100} loading={payout.isPending} onPress={() => payout.mutate()} style={{ alignSelf: 'flex-start' }} />
            <T v="meta" color="rgba(255,255,255,0.7)">Minimum ৳100. Paid within 2 working days.</T>
          </Card>
          <Row gap={S.md} wrap style={{ marginTop: S.lg }}>
            <Stat label="Delivered orders" value={String(e.delivered)} />
            <Stat label="Total earned" value={tk(e.net)} sub={`${tk(e.gross)} sales − ${tk(e.commission)} commission${e.deductions ? ` − ${tk(e.deductions)} refunds` : ''}`} />
          </Row>
          <Section title="Recent orders">
            {e.recent.length ? (
              <Card style={{ gap: S.sm }}>
                {e.recent.map((r, i) => (
                  <View key={r.id} style={{ gap: S.sm }}>
                    {i ? <Divider /> : null}
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View><T v="label">{r.code}</T><T v="meta">{day(r.updatedAt)} · {tk(r.subtotal)} sale</T></View>
                      <T v="price" style={{ fontSize: 15 }} color={C.ok}>+{tk(r.cookEarning)}</T>
                    </Row>
                  </View>
                ))}
              </Card>
            ) : <Note>Your first delivered order will show here.</Note>}
          </Section>
          {e.payouts.length ? (
            <Section title="Withdrawals">
              <Card style={{ gap: S.sm }}>
                {e.payouts.map((p) => <Row key={p.id} style={{ justifyContent: 'space-between' }}><View style={{ flex: 1 }}><KV k={`${day(p.createdAt)} · ${p.method}`} v={tk(p.amount)} /></View><Badge label={p.status.charAt(0) + p.status.slice(1).toLowerCase()} tone={p.status === 'PAID' ? 'ok' : p.status === 'REJECTED' ? 'err' : 'warn'} /></Row>)}
              </Card>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}
