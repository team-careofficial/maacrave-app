import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Banknote, FileText, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { day, tk } from '@/format';
import { num, t } from '@/i18n';
import { C, R, S } from '@/theme';
import { Badge, Button, Card, Divider, ErrorState, Header, KV, Loading, Meter, Note, Row, Screen, Section, T } from '@/ui';
import { Bars, Stat } from '@/ui/bars';

export default function RiderEarnings() {
  const q = useQuery({ queryKey: ['riderEarnings'], queryFn: API.riderEarnings });
  const e = q.data;
  const w = e?.wallet;
  return (
    <Screen header={<Header title="Earnings" />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error || !e || !w ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Row gap={S.md} wrap style={{ marginTop: S.sm }}>
            <Stat label="Today" value={tk(e.today)} />
            <Stat label="This week" value={tk(e.week)} />
            <Stat label="All time" value={tk(e.total)} sub={t(`${e.drops} drops`, `${num(e.drops)}টি ডেলিভারি`)} />
          </Row>

          {/* settlement: cash in hand vs unpaid earnings */}
          <Section title="Your balance">
            <Card style={{ gap: S.md }}>
              <View style={{ backgroundColor: w.balance > 0 ? C.warnSoft : C.okSoft, borderRadius: R.md, padding: S.lg, gap: 4 }}>
                <T v="eyebrow" color={w.balance > 0 ? C.warn : C.ok}>{w.balance > 0 ? t('You owe MaaCrave', 'আপনি MaaCrave-কে দেবেন') : w.balance < 0 ? t('MaaCrave owes you', 'MaaCrave আপনাকে দেবে') : t('All settled', 'সব হিসাব মেটানো')}</T>
                <T v="big" color={w.balance > 0 ? C.warn : C.ok}>{tk(Math.abs(w.balance))}</T>
                <T v="meta">{t('Cash you hold minus earnings not yet paid. Settled weekly.', 'আপনার কাছে থাকা নগদ বাদ পরিশোধ না হওয়া আয়। সাপ্তাহিক হিসাব হয়।')}</T>
              </View>
              <KV k={t('Cash collected from customers', 'গ্রাহকের কাছ থেকে নেওয়া নগদ')} v={tk(w.cashCollected)} />
              <KV k={t('Cash handed in', 'জমা দেওয়া নগদ')} v={`−${tk(w.deposited)}`} />
              <KV k={t('Cash in hand', 'হাতে থাকা নগদ')} v={tk(w.cashInHand)} strong />
              <View style={{ gap: 6 }}>
                <Meter value={w.cashInHand} max={w.cashLimit} ok={!w.overLimit} />
                <T v="meta" color={w.overLimit ? C.err : C.muted}>{w.overLimit ? t(`Over the ${tk(w.cashLimit)} limit — hand in cash before taking new cash orders.`, `${tk(w.cashLimit)} সীমা পেরিয়েছে — নতুন ক্যাশ অর্ডার নেওয়ার আগে নগদ জমা দিন।`) : t(`Cash limit ${tk(w.cashLimit)}`, `নগদ সীমা ${tk(w.cashLimit)}`)}</T>
              </View>
              <Divider />
              <KV k={t('Earned (all time)', 'মোট আয়')} v={tk(w.earnedTotal)} />
              <KV k={t('Paid to you', 'আপনাকে দেওয়া হয়েছে')} v={`−${tk(w.paidOut)}`} />
              <KV k={t('Unpaid earnings', 'বাকি আয়')} v={tk(w.unpaidEarnings)} strong color={C.ok} />
            </Card>
          </Section>

          <Section title="Last 7 days"><Card><Bars data={e.last7Days} /></Card></Section>

          <Section title="Recent drops">
            {e.recent.length ? (
              <Card style={{ gap: S.sm }}>
                {e.recent.map((r, i) => (
                  <View key={r.id} style={{ gap: S.sm }}>
                    {i ? <Divider /> : null}
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <T v="label">{r.code}{r.batchId ? ` · ${t('group', 'গ্রুপ')}` : ''}</T>
                        <T v="meta">{day(r.updatedAt)} · {r.area}{r.distanceKm ? ` · ${num(r.distanceKm.toFixed(1))} ${t('km', 'কিমি')}` : ''}{r.cash ? ` · ${t('cash', 'নগদ')} ${tk(r.cash)}` : ''}</T>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T v="price" style={{ fontSize: 15 }} color={C.ok}>+{tk(r.riderPayout + (r.tip || 0))}</T>
                        {r.tip ? <T v="meta" color={C.ok}>{t(`incl. ${tk(r.tip)} tip`, `${tk(r.tip)} টিপসহ`)}</T> : null}
                      </View>
                    </Row>
                  </View>
                ))}
              </Card>
            ) : <Note>Your delivered drops will show here.</Note>}
          </Section>

          {e.ledger.length ? (
            <Section title="Deposits and payouts">
              <Card style={{ gap: S.sm }}>
                {e.ledger.map((l, i) => (
                  <View key={l.id} style={{ gap: S.sm }}>
                    {i ? <Divider /> : null}
                    <Row gap={S.md}>
                      {l.kind === 'PAYOUT' ? <Wallet size={18} color={C.ok} /> : <Banknote size={18} color={C.warn} />}
                      <View style={{ flex: 1 }}><T v="label">{l.kind === 'PAYOUT' ? t('Paid to you', 'আপনাকে দেওয়া') : t('Cash handed in', 'নগদ জমা')}</T><T v="meta">{day(l.createdAt)}{l.reference ? ` · ${l.reference}` : ''}</T></View>
                      <Badge label={tk(l.amount)} tone={l.kind === 'PAYOUT' ? 'ok' : 'warn'} />
                    </Row>
                  </View>
                ))}
              </Card>
            </Section>
          ) : null}

          <View style={{ marginTop: S.lg, gap: S.sm }}>
            <Button title="My pay rates" v="outline" icon={<FileText size={16} color={C.text} />} onPress={() => router.push('/partner/rider')} />
          </View>
        </>
      )}
    </Screen>
  );
}
