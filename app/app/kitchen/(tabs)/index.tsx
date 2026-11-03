import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, MessageSquare, Plus, Users, Wallet, CalendarDays, FileText } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { num, t } from '@/i18n';
import { firstName, tk } from '@/format';
import { useAuth } from '@/auth';
import { C, ON_GLOSS, ON_GLOSS_SOFT, S } from '@/theme';
import { Button, Card, ErrorState, Glossy, IconButton, IconTile, Loading, Note, Rings, Row, Screen, Section, T, Toggle, useToast } from '@/ui';
import { Bars } from '@/ui/bars';
import { BrandBar } from '@/ui/brand';

export default function KitchenToday() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['kitchen'], queryFn: API.kitchen, refetchInterval: 30_000 });
  const notifs = useQuery({ queryKey: ['notifications', 'COOK'], queryFn: () => API.notifications('COOK') });
  const terms = useQuery({ queryKey: ['terms', 'COOK'], queryFn: () => API.partnerTerms('COOK') });
  const accepting = useMutation({
    mutationFn: (v: boolean) => API.updateKitchen({ accepting: v }),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['kitchen'] }); toast(v ? 'You’re open for orders' : 'Kitchen paused'); },
    onError: (e: Error) => { toast(e.message); if (terms.data && !terms.data.accepted) router.push('/partner/cook'); },
  });
  const k = q.data;
  const unread = (notifs.data || []).filter((n) => !n.read).length;

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}
      header={<BrandBar sub={`Kitchen · ${k?.kitchen.displayName || firstName(me?.name)}`} right={
        <IconButton label="Notifications" badge={unread} onPress={() => router.push('/notifications')}><Bell size={20} color={C.text} /></IconButton>
      } />}>
      {q.isLoading ? <Loading /> : q.error || !k ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          {terms.data && !terms.data.accepted ? (
            <Card accent onPress={() => router.push('/partner/cook')} style={{ marginTop: S.sm }}>
              <Row gap={S.md}><FileText size={20} color={C.brand} /><View style={{ flex: 1 }}><T v="label">{terms.data.lastAcceptedVersion ? t('Rates have changed — please review', 'রেট বদলেছে — দেখে নিন') : t('Review your rates and partner terms', 'আপনার রেট ও পার্টনার শর্তাবলি দেখুন')}</T><T v="meta">{t(`You keep ${100 - terms.data.rates.commissionPct}% of every sale · accept to open your kitchen`, `প্রতি বিক্রির ${num(100 - terms.data.rates.commissionPct)}% আপনার · রান্নাঘর খুলতে সম্মতি দিন`)}</T></View></Row>
            </Card>
          ) : null}
          <Card style={{ marginTop: S.sm, backgroundColor: k.kitchen.accepting ? C.okSoft : C.card }}>
            <Toggle value={k.kitchen.accepting} onChange={(v) => accepting.mutate(v)} label={k.kitchen.accepting ? 'Open for orders' : 'Kitchen paused'}
              sub={k.kitchen.accepting ? 'Customers can order and send you requests.' : 'Your dishes are hidden until you open again.'} />
          </Card>

          <Glossy style={{ marginTop: S.lg }}>
            <View style={{ padding: S.xl, gap: S.lg }}>
              <Rings size={240} right={-80} top={-90} />
              <View>
                <T v="eyebrow" color={ON_GLOSS_SOFT}>Earned today</T>
                <T v="big" color={ON_GLOSS} style={{ fontSize: 40, lineHeight: 44 }}>{tk(k.today)}</T>
                <T v="meta" color={ON_GLOSS_SOFT}>after commission · {tk(k.available)} ready to withdraw</T>
              </View>
              <Row gap={S.sm} wrap>
                {[`${k.activeOrders} active order${k.activeOrders === 1 ? '' : 's'}`, `${k.activeBatches} group batch${k.activeBatches === 1 ? '' : 'es'}`, `${k.delivered} delivered`].map((x) => (
                  <View key={x} style={{ backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' }}><T v="meta" color={ON_GLOSS}>{x}</T></View>
                ))}
              </Row>
            </View>
          </Glossy>

          {k.newRequests ? (
            <Card accent onPress={() => router.push('/kitchen/requests')} style={{ marginTop: S.md }}>
              <Row><IconTile Icon={MessageSquare} /><View style={{ flex: 1 }}><T v="label">{k.newRequests} new request{k.newRequests > 1 ? 's' : ''} near {k.kitchen.area}</T><T v="meta">Send a price before another mother does</T></View><T v="label" color={C.brandText}>Reply</T></Row>
            </Card>
          ) : null}

          <Section title="Quick actions">
            <Row gap={S.sm} wrap>
              <Button title="Add a dish" v="dark" icon={<Plus size={16} color="#fff" />} onPress={() => router.push('/kitchen/dish/new')} />
              <Button title="Open group batch" v="outline" icon={<Users size={16} color={C.text} />} onPress={() => router.push('/kitchen/new-batch')} />
              <Button title="Meal plans" v="outline" icon={<CalendarDays size={16} color={C.text} />} onPress={() => router.push('/kitchen/plans')} />
              <Button title="Earnings" v="outline" icon={<Wallet size={16} color={C.text} />} onPress={() => router.push('/kitchen/earnings')} />
            </Row>
          </Section>

          <Section title="Last 7 days" sub={`${tk(k.last7Days.reduce((a, d) => a + d.amount, 0))} earned · ${tk(k.available)} available to withdraw`}>
            <Card><Bars data={k.last7Days} /></Card>
          </Section>

          {k.kitchen.hygieneChecks < 3 ? <View style={{ marginTop: S.lg }}><Note tone="warn">Finish your hygiene checklist in Kitchen settings — kitchens with all checks get more orders.</Note></View> : null}
        </>
      )}
    </Screen>
  );
}
