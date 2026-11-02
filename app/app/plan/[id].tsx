import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Clock, Plus, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { day, tk } from '@/format';
import { useAddresses } from '@/hooks';
import { num, t } from '@/i18n';
import { daysText, dhakaDate, mealOf, mealsInPlan, PERIOD_DAYS, PERIOD_LABEL, timeText } from '@/plans';
import { C, R, S } from '@/theme';
import { Badge, Button, Card, Chip, Choice, ErrorState, Footer, Header, Input, KV, Loading, Note, Row, Screen, Section, T, useToast } from '@/ui';

export default function PlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const plan = useQuery({ queryKey: ['plan', id], queryFn: () => API.plan(id) });
  const addresses = useAddresses();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [start, setStart] = useState(dhakaDate(1));
  const [notes, setNotes] = useState('');
  const starts = Array.from({ length: 7 }, (_, i) => dhakaDate(i + 1));
  const addr = addresses.data?.find((a) => a.id === addressId) || addresses.data?.find((a) => a.isDefault) || addresses.data?.[0];

  const sub = useMutation({
    mutationFn: () => API.subscribe(id, { addressId: addr!.id, startDate: start, notes: notes.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); qc.invalidateQueries({ queryKey: ['plans'] }); toast('You’re subscribed'); router.replace('/plans'); },
    onError: (e: Error) => toast(e.message),
  });

  if (plan.isLoading) return <Screen header={<Header back title="Meal plan" />}><Loading /></Screen>;
  if (plan.error || !plan.data) return <Screen header={<Header back title="Meal plan" />}><ErrorState error={plan.error} onRetry={plan.refetch} /></Screen>;
  const p = plan.data;
  const m = mealOf(p.meal);
  const meals = mealsInPlan(p.days, p.period, new Date(`${start}T12:00:00+06:00`));
  const full = (p._count?.subscriptions || 0) >= p.capacity;
  const endDate = new Date(new Date(`${start}T12:00:00+06:00`).getTime() + (PERIOD_DAYS[p.period] - 1) * 86400_000);

  return (
    <Screen header={<Header back title="Meal plan" />}
      footer={status === 'ready' ? <Footer><Button full size="lg" title={full ? 'This plan is full' : !p.active ? 'Not taking subscribers' : 'Subscribe'} sub={full || !p.active ? undefined : t(`About ${tk(meals * p.pricePerMeal)} over ${PERIOD_DAYS[p.period]} days · cash per meal`, `${num(PERIOD_DAYS[p.period])} দিনে প্রায় ${tk(meals * p.pricePerMeal)} · প্রতি বেলা নগদে`)} disabled={full || !p.active || !addr} loading={sub.isPending} onPress={() => sub.mutate()} /></Footer> : undefined}>
      <View style={{ backgroundColor: m.bg, borderRadius: R.xl, padding: S.xl, gap: S.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={S.sm}><View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><m.Icon size={20} color={m.fg} /></View><T v="label" color={m.fg}>{m.label}</T></Row>
          <Badge label={PERIOD_LABEL[p.period]} tone="brand" />
        </Row>
        <T v="title">{p.title}</T>
        <T v="meta">{p.cook.displayName} · {p.cook.area}</T>
        {p.description ? <T v="body" color={C.text2}>{p.description}</T> : null}
      </View>

      <Card style={{ marginTop: S.lg, gap: S.sm }}>
        <Row gap={6}><CalendarDays size={16} color={C.muted} /><T v="label">{daysText(p.days)}</T></Row>
        <Row gap={6}><Clock size={16} color={C.muted} /><T v="label">{t('Arrives around', 'পৌঁছাবে প্রায়')} {timeText(p.deliverAt)}</T></Row>
        <Row gap={6}><Wallet size={16} color={C.muted} /><T v="label">{tk(p.pricePerMeal)} {t('per meal + delivery, cash on delivery', 'প্রতি বেলা + ডেলিভারি, খাবার পেলে নগদে')}</T></Row>
        <Button title="See this kitchen" size="sm" v="ghost" onPress={() => router.push(`/cook/${p.cook.id}`)} style={{ alignSelf: 'flex-start' }} />
      </Card>

      {status !== 'ready' ? <View style={{ marginTop: S.lg }}><Button full title="Sign in to subscribe" onPress={() => router.push('/sign-in')} /></View> : (
        <>
          <Section title="Start date" sub={t(`${PERIOD_LABEL[p.period]} plan: ${day(start)} – ${day(endDate)} · ${meals} meals`, `${num(day(start))} – ${num(day(endDate))} · ${num(meals)} বেলা`)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
              {starts.map((d, i) => <Chip key={d} label={i === 0 ? t('Tomorrow', 'আগামীকাল') : num(day(`${d}T12:00:00+06:00`))} on={start === d} onPress={() => setStart(d)} />)}
            </ScrollView>
          </Section>
          <Section title="Deliver to">
            {addresses.isLoading ? <Loading rows={1} /> : addresses.data?.length ? (
              <View style={{ gap: S.sm }}>{addresses.data.map((a) => <Choice key={a.id} on={addr?.id === a.id} onPress={() => setAddressId(a.id)} label={`${a.label} · ${a.area}`} sub={[`House ${a.house}`, a.road, a.floor, a.landmark].filter(Boolean).join(', ')} />)}</View>
            ) : <Note tone="warn">Add a delivery address first.</Note>}
            <Button title="Add new address" v="ghost" size="sm" icon={<Plus size={16} color={C.text} />} onPress={() => router.push('/addresses')} style={{ alignSelf: 'flex-start', marginTop: S.sm }} />
          </Section>
          <Section title="Note for the mother">
            <Input placeholder="Less oil, no beef, ring the bell twice…" value={notes} onChangeText={setNotes} maxLength={200} />
          </Section>
          <View style={{ marginTop: S.lg, gap: S.sm }}>
            <KV k="Price per meal" v={tk(p.pricePerMeal)} />
            <KV k="Meals in this plan" v={num(meals)} />
            <Note>Every delivery day a normal order is made for you and shows up in Orders. Pay the rider in cash for each meal. You can pause or cancel any time from My plans.</Note>
          </View>
        </>
      )}
    </Screen>
  );
}
