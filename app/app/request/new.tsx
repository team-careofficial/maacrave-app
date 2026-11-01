import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { API } from '@/api';
import { tk } from '@/format';
import { useAddresses } from '@/hooks';
import { C, CATEGORY_META, R, S } from '@/theme';
import { Button, Card, CategoryTile, Chip, Choice, Divider, Field, Header, Input, KV, Note, Row, Screen, Stepper, T, Toggle, useToast } from '@/ui';
import { Grid } from '@/ui/grid';

const STEPS = ['Dish', 'Amount', 'Taste', 'Review'];
const SLOTS = [8, 10, 13, 16, 19, 21];
const DIETS = ['Halal', 'No beef', 'Vegetarian', 'Low salt', 'Diabetic friendly', 'Kid friendly'];
const BUDGETS = [120, 150, 200, 250, 350, 500];

function slotDate(dayOffset: number, hour: number) {
  const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(hour, 0, 0, 0); return d;
}
const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

export default function NewRequest() {
  const p = useLocalSearchParams<{ dish?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const addresses = useAddresses();
  const [step, setStep] = useState(0);
  const [dishName, setDishName] = useState(p.dish || '');
  const [category, setCategory] = useState('bengali');
  const [portions, setPortions] = useState(2);
  const [budget, setBudget] = useState(200);
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const [spice, setSpice] = useState('Medium');
  const [oil, setOil] = useState('Normal');
  const [diet, setDiet] = useState<string[]>(['Halal']);
  const [allergies, setAllergies] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [notes, setNotes] = useState('');
  const [allowGroup, setAllowGroup] = useState(true);
  const [addressId, setAddressId] = useState<string | null>(null);
  const addr = addresses.data?.find((a) => a.id === addressId) || addresses.data?.find((a) => a.isDefault) || addresses.data?.[0];

  const minTime = Date.now() + 60 * 60_000;
  const neededAt = hour != null ? slotDate(dayOffset, hour) : null;
  const valid = [dishName.trim().length >= 3, !!neededAt && neededAt.getTime() >= minTime && budget >= 50, true, !!addr];

  const create = useMutation({
    mutationFn: () => API.createRequest({
      dishName: dishName.trim(), category, portions, budgetPerPortion: budget, neededAt: neededAt!.toISOString(), addressId: addr!.id,
      spice, oil, diet, allergies: allergies.trim() || undefined, exclusions: exclusions.trim() || undefined, notes: notes.trim() || undefined, allowGroup,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast('Request sent to mothers nearby'); router.replace('/requests'); },
  });

  const days = useMemo(() => [0, 1, 2].map((o) => ({ o, label: o === 0 ? 'Today' : o === 1 ? 'Tomorrow' : slotDate(2, 12).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }) })), []);

  const next = () => (step < 3 ? setStep(step + 1) : create.mutate());
  return (
    <Screen header={<Header back title="Request a dish" sub={`Step ${step + 1} of 4 · ${STEPS[step]}`} />}
      footer={
        <>
          {step > 0 ? <Button title="Back" v="outline" size="lg" onPress={() => setStep(step - 1)} /> : null}
          <Button title={step < 3 ? 'Continue' : 'Send request'} size="lg" style={{ flex: 1 }} disabled={!valid[step]} loading={create.isPending} onPress={next} />
        </>
      }>
      <Row gap={6} style={{ marginTop: S.sm, marginBottom: S.xl }}>
        {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? C.brand : C.line }} />)}
      </Row>

      {step === 0 ? (
        <View style={{ gap: S.xl }}>
          <View><T v="title">What would you like?</T><T v="sub" style={{ marginTop: 4 }}>Be specific — “Shorshe ilish, less oil” helps mothers price it right.</T></View>
          <Input label="Dish name" value={dishName} onChangeText={setDishName} placeholder="e.g. Beef tehari" maxLength={60} autoFocus />
          <Field label="Category">
            <Grid max={3} gap={S.sm}>
              {Object.entries(CATEGORY_META).map(([k, m]) => (
                <Pressable key={k} onPress={() => setCategory(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.sm, borderRadius: R.md, borderWidth: 1.5, borderColor: category === k ? C.brand : C.line2, backgroundColor: category === k ? C.brandSoft : C.surface }}>
                  <CategoryTile category={k} size={32} />
                  <T v="label" numberOfLines={1} style={{ flex: 1 }}>{m.label}</T>
                </Pressable>
              ))}
            </Grid>
          </Field>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: S.xl }}>
          <View><T v="title">How much, and when?</T><T v="sub" style={{ marginTop: 4 }}>Cooks need at least one hour. Bigger orders get more replies with more notice.</T></View>
          <Field label="Portions">
            <Row style={{ justifyContent: 'space-between' }}><T v="sub">{portions} portion{portions > 1 ? 's' : ''}</T><Stepper value={portions} onChange={setPortions} max={60} large /></Row>
          </Field>
          <Field label="Budget per portion" hint={`About ${tk(budget * portions)} for the food, plus delivery and service fee.`}>
            <Row gap={S.sm} wrap>{BUDGETS.map((b) => <Chip key={b} label={tk(b)} on={budget === b} onPress={() => setBudget(b)} />)}</Row>
            <Input value={String(budget)} onChangeText={(t) => setBudget(Math.min(2000, Number(t.replace(/\D/g, '')) || 0))} keyboardType="number-pad" prefix="৳" style={{ marginTop: S.sm }} />
          </Field>
          <Field label="Delivery day">
            <Row gap={S.sm}>{days.map((d) => <Chip key={d.o} label={d.label} on={dayOffset === d.o} onPress={() => { setDayOffset(d.o); setHour(null); }} />)}</Row>
          </Field>
          <Field label="Time" error={neededAt && neededAt.getTime() < minTime ? 'Pick a later time' : null}>
            <Grid max={3} gap={S.sm}>
              {SLOTS.map((h) => {
                const ok = slotDate(dayOffset, h).getTime() >= minTime;
                const on = hour === h;
                return (
                  <Pressable key={h} disabled={!ok} onPress={() => setHour(h)} style={{ height: 46, borderRadius: R.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: on ? C.brand : C.line2, backgroundColor: on ? C.brandSoft : ok ? C.surface : C.surface2 }}>
                    <T v="label" color={ok ? (on ? C.brandText : C.text) : C.muted}>{hourLabel(h)}</T>
                  </Pressable>
                );
              })}
            </Grid>
          </Field>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: S.xl }}>
          <View><T v="title">Make it your way</T><T v="sub" style={{ marginTop: 4 }}>Optional — tell the cook how you like it.</T></View>
          <Field label="Spice"><Row gap={S.sm}>{['Mild', 'Medium', 'Hot'].map((s) => <Chip key={s} label={s} on={spice === s} onPress={() => setSpice(s)} />)}</Row></Field>
          <Field label="Oil"><Row gap={S.sm}>{['Low oil', 'Normal', 'Rich'].map((s) => <Chip key={s} label={s} on={oil === s} onPress={() => setOil(s)} />)}</Row></Field>
          <Field label="Diet"><Row gap={S.sm} wrap>{DIETS.map((s) => <Chip key={s} label={s} on={diet.includes(s)} icon={diet.includes(s) ? <Check size={14} color={C.brandText} /> : undefined} onPress={() => setDiet(diet.includes(s) ? diet.filter((x) => x !== s) : [...diet, s])} />)}</Row></Field>
          <Input label="Allergies" value={allergies} onChangeText={setAllergies} placeholder="e.g. peanuts, shrimp" maxLength={120} />
          <Input label="Leave out" value={exclusions} onChangeText={setExclusions} placeholder="e.g. no coriander" maxLength={120} />
          <Input label="Note for the cook" value={notes} onChangeText={setNotes} placeholder="Anything else they should know" maxLength={300} multiline style={{ minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 }} />
          <Toggle value={allowGroup} onChange={setAllowGroup} label="Open to a group order" sub="The cook may make extra portions for neighbours — you pay less for delivery." />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: S.xl }}>
          <View><T v="title">Review & send</T><T v="sub" style={{ marginTop: 4 }}>Mothers near your address will reply with a price. You don’t pay until you accept one.</T></View>
          <Card style={{ gap: S.sm }}>
            <Row><CategoryTile category={category} /><View style={{ flex: 1 }}><T v="card">{dishName}</T><T v="meta">{CATEGORY_META[category]?.label}</T></View></Row>
            <Divider />
            <KV k="Portions" v={String(portions)} />
            <KV k="Budget" v={`${tk(budget)} each · ${tk(budget * portions)}`} />
            <KV k="When" v={neededAt ? `${days[dayOffset].label}, ${hourLabel(hour!)}` : '—'} />
            <KV k="Taste" v={`${spice} · ${oil}${diet.length ? ' · ' + diet.join(', ') : ''}`} />
            {allergies ? <KV k="Allergies" v={allergies} color={C.err} /> : null}
            <KV k="Group order" v={allowGroup ? 'Allowed' : 'Only me'} />
          </Card>
          <Field label="Deliver to">
            {addresses.data?.length ? (
              <View style={{ gap: S.sm }}>
                {addresses.data.map((a) => <Choice key={a.id} on={addr?.id === a.id} onPress={() => setAddressId(a.id)} label={`${a.label} · ${a.area}`} sub={`House ${a.house}, ${a.road}`} />)}
              </View>
            ) : <Note tone="warn">Add a delivery address so mothers in your area can see the request.</Note>}
            <Button title="Add address" v="ghost" size="sm" icon={<Plus size={16} color={C.text} />} onPress={() => router.push('/addresses')} style={{ alignSelf: 'flex-start', marginTop: S.sm }} />
          </Field>
          {create.error ? <Note tone="err">{(create.error as Error).message}</Note> : null}
        </View>
      ) : null}
    </Screen>
  );
}
