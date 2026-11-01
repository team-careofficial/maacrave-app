import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { tk } from '@/format';
import { S } from '@/theme';
import { Button, Chip, Choice, Empty, Field, Header, Input, Loading, Note, Row, Screen, Stepper, T, useToast } from '@/ui';

const CLOSES = [{ m: 60, l: '1 hour' }, { m: 120, l: '2 hours' }, { m: 240, l: '4 hours' }, { m: 480, l: '8 hours' }];

export default function NewBatch() {
  const qc = useQueryClient();
  const toast = useToast();
  const dishes = useQuery({ queryKey: ['kitchenDishes'], queryFn: API.kitchenDishes });
  const [dishId, setDishId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [min, setMin] = useState(5);
  const [max, setMax] = useState(15);
  const [closes, setCloses] = useState(120);
  const dish = dishes.data?.find((d) => d.id === dishId);
  useEffect(() => { if (dish) setPrice(String(Math.round(dish.price * 0.9))); }, [dish]);
  const m = useMutation({
    mutationFn: () => API.createBatch({ dishId: dishId!, pricePerPortion: Number(price), minPortions: min, maxPortions: Math.max(min, max), closesInMinutes: closes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchenBatches'] }); qc.invalidateQueries({ queryKey: ['kitchen'] }); toast('Group batch is live'); router.back(); },
  });
  const p = Number(price) || 0;
  return (
    <Screen header={<Header back title="Open a group batch" />}
      footer={<Button title="Open batch" size="lg" style={{ flex: 1 }} disabled={!dishId || p < 30} loading={m.isPending} onPress={() => m.mutate()} />}>
      <T v="sub" style={{ marginTop: S.sm }}>Cook one big pot for many neighbours. Customers join until the cut-off; if the minimum isn’t reached you can cancel and everyone is refunded.</T>
      {dishes.isLoading ? <Loading /> : !dishes.data?.length ? (
        <Empty Icon={Users} title="Add a dish first" text="Group batches are made from dishes on your menu." action="Add a dish" onAction={() => router.replace('/kitchen/dish/new')} />
      ) : (
        <View style={{ gap: S.xl, marginTop: S.xl }}>
          <Field label="Dish">
            <View style={{ gap: S.sm }}>{dishes.data.map((d) => <Choice key={d.id} on={dishId === d.id} onPress={() => setDishId(d.id)} label={d.name} sub={`Menu price ${tk(d.price)} · ${d.portion}`} />)}</View>
          </Field>
          <Input label="Group price per portion" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" prefix="৳" hint="A little below your menu price brings more people in." />
          <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}><Field label="Minimum to cook"><Stepper value={min} onChange={(n) => { setMin(n); if (max < n) setMax(n); }} min={1} max={200} large /></Field></View>
            <View style={{ flex: 1 }}><Field label="Maximum portions"><Stepper value={max} onChange={setMax} min={min} max={200} large /></Field></View>
          </Row>
          <Field label="Joining closes in"><Row gap={S.sm} wrap>{CLOSES.map((c) => <Chip key={c.m} label={c.l} on={closes === c.m} onPress={() => setCloses(c.m)} />)}</Row></Field>
          {m.error ? <Note tone="err">{(m.error as Error).message}</Note> : null}
        </View>
      )}
    </Screen>
  );
}
