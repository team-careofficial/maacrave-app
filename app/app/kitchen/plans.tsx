import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Pencil, Plus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { day, tk } from '@/format';
import { num, t } from '@/i18n';
import { DAY_KEYS, dayName, daysText, mealOf, MEALS, PERIOD_LABEL, SUB_LABEL, SUB_TONE, timeText } from '@/plans';
import { C, S } from '@/theme';
import type { MealPlan, MealSlot, PlanPeriod } from '@/types';
import { Badge, Button, Card, Chip, Empty, ErrorState, Field, Header, Input, Loading, Note, Row, Screen, Section, Segmented, T, Toggle, useToast } from '@/ui';

const DEFAULT_TIME: Record<MealSlot, string> = { BREAKFAST: '08:30', LUNCH: '13:30', DINNER: '20:30' };

function PlanForm({ plan, onDone }: { plan?: MealPlan; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(plan?.title || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [meal, setMeal] = useState<MealSlot>(plan?.meal || 'LUNCH');
  const [period, setPeriod] = useState<PlanPeriod>(plan?.period || 'WEEKLY');
  const [days, setDays] = useState<number[]>(plan?.days || [6, 0, 1, 2, 3, 4]);
  const [price, setPrice] = useState(plan ? String(plan.pricePerMeal) : '');
  const [time, setTime] = useState(plan?.deliverAt || DEFAULT_TIME.LUNCH);
  const [capacity, setCapacity] = useState(plan ? String(plan.capacity) : '10');
  const [active, setActive] = useState(plan?.active ?? true);

  const priceN = Number(price), capN = Number(capacity);
  const err = title.trim().length < 3 ? 'Give the plan a name' : !(priceN >= 40 && priceN <= 2000) ? 'Price per meal must be ৳40–৳2000' : !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? 'Time must look like 13:30' : !(capN >= 1 && capN <= 200) ? 'Customers must be 1–200' : !days.length ? 'Pick at least one day' : null;
  const save = useMutation({
    mutationFn: () => plan
      ? API.editPlan(plan.id, { title: title.trim(), description: description.trim(), pricePerMeal: priceN, deliverAt: time, capacity: capN, active })
      : API.createPlan({ title: title.trim(), description: description.trim() || undefined, meal, period, days, pricePerMeal: priceN, deliverAt: time, capacity: capN, active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen-plans'] }); toast('Plan saved'); onDone(); },
    onError: (e: Error) => toast(e.message),
  });
  return (
    <Card style={{ gap: S.md }}>
      <T v="card">{plan ? 'Edit plan' : 'New meal plan'}</T>
      <Input label="Plan name" placeholder="Daily home lunch — rice, dal, fish" value={title} onChangeText={setTitle} maxLength={50} />
      <Input label="What’s in it" placeholder="Rice, dal, one vegetable and fish or chicken, changes every day" value={description} onChangeText={setDescription} maxLength={300} multiline />
      {plan ? <Note>{t(`${mealOf(meal).label} · ${PERIOD_LABEL[period]} · ${daysText(days)} can’t be changed after the plan is made. Make a new plan instead.`, 'বেলা, মেয়াদ ও দিন পরে বদলানো যায় না। দরকার হলে নতুন প্ল্যান বানান।')}</Note> : (
        <>
          <Field label="Meal">
            <Row gap={S.sm} wrap>{MEALS.map((m) => <Chip key={m.key} label={m.label} on={meal === m.key} onPress={() => { setMeal(m.key); setTime(DEFAULT_TIME[m.key]); }} />)}</Row>
          </Field>
          <Field label="Plan length">
            <Segmented items={[{ key: 'WEEKLY', label: 'Weekly (7 days)' }, { key: 'MONTHLY', label: 'Monthly (30 days)' }]} value={period} onChange={setPeriod} />
          </Field>
          <Field label="Cooking days">
            <Row gap={S.sm} wrap>{DAY_KEYS.map((d) => <Chip key={d} label={dayName(d)} on={days.includes(d)} onPress={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])} />)}</Row>
          </Field>
        </>
      )}
      <Row gap={S.sm}>
        <View style={{ flex: 1 }}><Input label="Price per meal" prefix="৳" keyboardType="number-pad" value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} /></View>
        <View style={{ flex: 1 }}><Input label="Delivery time" placeholder="13:30" value={time} onChangeText={setTime} maxLength={5} /></View>
      </Row>
      <Input label="Most customers" hint="How many people you can cook this for every day" keyboardType="number-pad" value={capacity} onChangeText={(v) => setCapacity(v.replace(/\D/g, ''))} />
      <Toggle value={active} onChange={setActive} label="Taking new subscribers" sub="Turn off to stop new people joining. Current plans keep going." />
      {err ? <T v="meta" color={C.err}>{err}</T> : null}
      <Row gap={S.sm}>
        <Button title="Save plan" loading={save.isPending} disabled={!!err} onPress={() => save.mutate()} />
        <Button title="Cancel" v="ghost" onPress={onDone} />
      </Row>
    </Card>
  );
}

export default function KitchenPlans() {
  const [tab, setTab] = useState<'plans' | 'people'>('plans');
  const [editing, setEditing] = useState<MealPlan | 'new' | null>(null);
  const plans = useQuery({ queryKey: ['kitchen-plans'], queryFn: API.kitchenPlans });
  const people = useQuery({ queryKey: ['kitchen-subscribers'], queryFn: API.subscribers, enabled: tab === 'people' });
  const q = tab === 'plans' ? plans : people;
  return (
    <Screen header={<Header back title="Meal plans" sub="Weekly and monthly customers" right={tab === 'plans' && !editing ? <Button title="New plan" size="sm" v="secondary" icon={<Plus size={16} color={C.brandText} />} onPress={() => setEditing('new')} /> : undefined} />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Segmented items={[{ key: 'plans', label: 'My plans' }, { key: 'people', label: 'Subscribers' }]} value={tab} onChange={setTab} />
      <View style={{ marginTop: S.lg, gap: S.md }}>
        {tab === 'plans' ? (
          <>
            {editing ? <PlanForm key={editing === 'new' ? 'new' : editing.id} plan={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} /> : null}
            {plans.isLoading ? <Loading /> : plans.error ? <ErrorState error={plans.error} onRetry={plans.refetch} /> : !plans.data?.length ? (
              editing ? null : <Empty Icon={CalendarDays} title="No meal plans yet" text="Offer breakfast, lunch or dinner every week or month. Each day’s meal becomes an order for you automatically." action="Make a plan" onAction={() => setEditing('new')} />
            ) : plans.data.map((p) => {
              const m = mealOf(p.meal);
              return (
                <Card key={p.id} style={{ gap: S.sm }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={S.sm} style={{ flex: 1 }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: m.bg, alignItems: 'center', justifyContent: 'center' }}><m.Icon size={18} color={m.fg} /></View>
                      <View style={{ flex: 1 }}><T v="label" numberOfLines={1}>{p.title}</T><T v="meta">{m.label} · {PERIOD_LABEL[p.period]} · {timeText(p.deliverAt)}</T></View></Row>
                    <Badge label={p.active ? 'Open' : 'Closed'} tone={p.active ? 'ok' : 'neutral'} />
                  </Row>
                  <T v="meta">{daysText(p.days)} · {tk(p.pricePerMeal)} {t('per meal', 'প্রতি বেলা')}</T>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={6}><Users size={14} color={C.muted} /><T v="meta">{t(`${p._count?.subscriptions || 0} of ${p.capacity} customers`, `${num(p.capacity)} জনের মধ্যে ${num(p._count?.subscriptions || 0)} জন`)}</T></Row>
                    <Button title="Edit" size="sm" v="ghost" icon={<Pencil size={14} color={C.text} />} onPress={() => setEditing(p)} />
                  </Row>
                </Card>
              );
            })}
          </>
        ) : people.isLoading ? <Loading /> : people.error ? <ErrorState error={people.error} onRetry={people.refetch} /> : !people.data?.length ? (
          <Empty Icon={Users} title="No subscribers yet" text="When customers join your plans they show up here. Today’s meals appear in Orders." />
        ) : (
          <Section title="Who you cook for" style={{ marginTop: 0 }}>
            <View style={{ gap: S.sm }}>
              {people.data.map((s) => (
                <Card key={s.id} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}><T v="label">{s.customer.name || t('Customer', 'গ্রাহক')}</T><Badge label={SUB_LABEL[s.status]} tone={SUB_TONE[s.status]} /></Row>
                  <T v="meta">{s.plan.title} · {mealOf(s.plan.meal).label} · {timeText(s.plan.deliverAt)}</T>
                  <T v="meta">{day(s.startDate)} – {day(s.endDate)} · {s.area}</T>
                  {s.notes ? <T v="meta" color={C.text2}>“{s.notes}”</T> : null}
                </Card>
              ))}
            </View>
          </Section>
        )}
      </View>
    </Screen>
  );
}
