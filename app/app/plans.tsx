import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarDays, Clock, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { day, tk } from '@/format';
import { num, t } from '@/i18n';
import { daysText, mealOf, MEALS, PERIOD_LABEL, SUB_LABEL, SUB_TONE, timeText } from '@/plans';
import { C, R, S } from '@/theme';
import type { MealPlan, MealSlot, PlanPeriod, Subscription } from '@/types';
import { Badge, Button, Card, Chip, confirm, Empty, ErrorState, Header, Loading, Row, Screen, Segmented, T, Tap, useToast } from '@/ui';
import { Grid } from '@/ui/grid';

function PlanCard({ p }: { p: MealPlan }) {
  const m = mealOf(p.meal);
  const left = Math.max(0, p.capacity - (p._count?.subscriptions || 0));
  return (
    <Tap onPress={() => router.push(`/plan/${p.id}`)} label={p.title} style={{ flex: 1 }}>
      <View style={{ backgroundColor: C.surface, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
        <View style={{ backgroundColor: m.bg, padding: S.lg, gap: S.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={S.sm}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><m.Icon size={18} color={m.fg} /></View><T v="label" color={m.fg}>{m.label}</T></Row>
            <Badge label={PERIOD_LABEL[p.period]} tone="brand" />
          </Row>
          <T v="card" numberOfLines={2}>{p.title}</T>
          {p.cook ? <T v="meta" numberOfLines={1}>{p.cook.displayName} · {p.cook.area}</T> : null}
        </View>
        <View style={{ padding: S.lg, gap: 6 }}>
          <Row gap={6}><CalendarDays size={14} color={C.muted} /><T v="meta" numberOfLines={1}>{daysText(p.days)}</T></Row>
          <Row gap={6}><Clock size={14} color={C.muted} /><T v="meta">{t('Arrives around', 'পৌঁছাবে প্রায়')} {timeText(p.deliverAt)}</T></Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <T v="price" color={C.brandText}>{tk(p.pricePerMeal)}<T v="meta"> {t('/ meal', '/ বেলা')}</T></T>
            <T v="meta" color={left ? C.ok : C.err}>{left ? t(`${left} spots left`, `${num(left)}টি জায়গা বাকি`) : t('Full', 'পূর্ণ')}</T>
          </Row>
        </View>
      </View>
    </Tap>
  );
}

function MySub({ s }: { s: Subscription }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = mealOf(s.plan.meal);
  const act = useMutation({
    mutationFn: (a: 'pause' | 'resume' | 'cancel') => API.changeSubscription(s.id, a),
    onSuccess: (d) => { qc.setQueryData(['subscriptions'], d); toast('Plan updated'); },
    onError: (e: Error) => toast(e.message),
  });
  const live = s.status === 'ACTIVE' || s.status === 'PAUSED';
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={S.sm} style={{ flex: 1 }}><View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: m.bg, alignItems: 'center', justifyContent: 'center' }}><m.Icon size={18} color={m.fg} /></View>
          <View style={{ flex: 1 }}><T v="label" numberOfLines={1}>{s.plan.title}</T><T v="meta" numberOfLines={1}>{s.plan.cook.displayName} · {m.label} · {PERIOD_LABEL[s.plan.period]}</T></View></Row>
        <Badge label={SUB_LABEL[s.status]} tone={SUB_TONE[s.status]} />
      </Row>
      <Row gap={6}><CalendarDays size={14} color={C.muted} /><T v="meta">{day(s.startDate)} – {day(s.endDate)} · {daysText(s.plan.days)}</T></Row>
      <Row gap={6}><MapPin size={14} color={C.muted} /><T v="meta" numberOfLines={1} style={{ flex: 1 }}>{s.addressText}</T></Row>
      <T v="meta">{t(`${tk(s.plan.pricePerMeal)} per meal, paid in cash when it arrives. Each day’s meal shows up in Orders.`, `প্রতি বেলা ${tk(s.plan.pricePerMeal)}, খাবার পৌঁছালে নগদে দিন। প্রতিদিনের খাবার অর্ডার পাতায় দেখা যাবে।`)}</T>
      {live ? (
        <Row gap={S.sm} wrap>
          {s.status === 'ACTIVE' ? <Button title="Pause" size="sm" v="outline" loading={act.isPending && act.variables === 'pause'} onPress={() => act.mutate('pause')} /> : <Button title="Resume" size="sm" v="secondary" loading={act.isPending && act.variables === 'resume'} onPress={() => act.mutate('resume')} />}
          <Button title="Cancel plan" size="sm" v="ghost" onPress={async () => { if (await confirm('Cancel this plan?', 'No more meals will be sent from this plan.', 'Cancel plan', true)) act.mutate('cancel'); }} />
        </Row>
      ) : null}
    </Card>
  );
}

export default function Plans() {
  const { status } = useAuth();
  const [tab, setTab] = useState<'find' | 'mine'>('find');
  const [meal, setMeal] = useState<MealSlot | undefined>();
  const [period, setPeriod] = useState<PlanPeriod | undefined>();
  const plans = useQuery({ queryKey: ['plans', meal, period], queryFn: () => API.plans({ meal, period }), enabled: tab === 'find' });
  const mine = useQuery({ queryKey: ['subscriptions'], queryFn: API.mySubscriptions, enabled: tab === 'mine' && status === 'ready' });
  const q = tab === 'find' ? plans : mine;
  return (
    <Screen header={<Header back title="Meal plans" sub="Home food every day — breakfast, lunch or dinner" />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Segmented items={[{ key: 'find', label: 'Find a plan' }, { key: 'mine', label: 'My plans' }]} value={tab} onChange={setTab} />
      {tab === 'find' ? (
        <>
          <Row gap={S.sm} wrap style={{ marginTop: S.lg }}>
            <Chip label="All meals" on={!meal} onPress={() => setMeal(undefined)} />
            {MEALS.map((m) => <Chip key={m.key} label={m.label} on={meal === m.key} onPress={() => setMeal(meal === m.key ? undefined : m.key)} icon={<m.Icon size={14} color={meal === m.key ? '#fff' : m.fg} />} />)}
          </Row>
          <Row gap={S.sm} wrap style={{ marginTop: S.sm }}>
            <Chip label="Any length" on={!period} onPress={() => setPeriod(undefined)} />
            <Chip label="Weekly" on={period === 'WEEKLY'} onPress={() => setPeriod('WEEKLY')} />
            <Chip label="Monthly" on={period === 'MONTHLY'} onPress={() => setPeriod('MONTHLY')} />
          </Row>
          <View style={{ marginTop: S.lg }}>
            {plans.isLoading ? <Loading /> : plans.error ? <ErrorState error={plans.error} onRetry={plans.refetch} /> : !plans.data?.length ? (
              <Empty Icon={CalendarDays} title="No plans here yet" text="Mothers are adding weekly and monthly plans. Try another meal, or request a dish today." action="Request a dish" onAction={() => router.push('/request/new')} />
            ) : <Grid>{plans.data.map((p) => <PlanCard key={p.id} p={p} />)}</Grid>}
          </View>
        </>
      ) : (
        <View style={{ marginTop: S.lg, gap: S.md }}>
          {mine.isLoading ? <Loading /> : mine.error ? <ErrorState error={mine.error} onRetry={mine.refetch} /> : !mine.data?.length ? (
            <Empty Icon={CalendarDays} title="You have no plans yet" text="Pick a weekly or monthly plan and a mother will cook for you on the days you choose." action="Find a plan" onAction={() => setTab('find')} />
          ) : mine.data.map((s) => <MySub key={s.id} s={s} />)}
        </View>
      )}
    </Screen>
  );
}
