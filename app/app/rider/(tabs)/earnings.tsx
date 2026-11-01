import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { API } from '@/api';
import { day, tk } from '@/format';
import { C, S } from '@/theme';
import { Card, Divider, ErrorState, Header, Loading, Note, Row, Screen, Section, T } from '@/ui';
import { Bars, Stat } from '@/ui/bars';

export default function RiderEarnings() {
  const q = useQuery({ queryKey: ['riderEarnings'], queryFn: API.riderEarnings });
  const e = q.data;
  return (
    <Screen header={<Header title="Earnings" />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error || !e ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Row gap={S.md} wrap style={{ marginTop: S.sm }}>
            <Stat label="Today" value={tk(e.today)} />
            <Stat label="This week" value={tk(e.week)} />
            <Stat label="All time" value={tk(e.total)} sub={`${e.drops} drops`} />
          </Row>
          <Section title="Last 7 days"><Card><Bars data={e.last7Days} /></Card></Section>
          <Section title="Recent drops">
            {e.recent.length ? (
              <Card style={{ gap: S.sm }}>
                {e.recent.map((r, i) => (
                  <View key={r.id} style={{ gap: S.sm }}>
                    {i ? <Divider /> : null}
                    <Row style={{ justifyContent: 'space-between' }}><View><T v="label">{r.code}</T><T v="meta">{day(r.updatedAt)} · {r.area}</T></View><T v="price" style={{ fontSize: 15 }} color={C.ok}>+{tk(r.riderPayout)}</T></Row>
                  </View>
                ))}
              </Card>
            ) : <Note>Your delivered drops will show here.</Note>}
          </Section>
          <View style={{ marginTop: S.lg }}><Note>Earnings are settled weekly to your bKash. Cash collected on delivery is deducted at settlement.</Note></View>
        </>
      )}
    </Screen>
  );
}
