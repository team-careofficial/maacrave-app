import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChefHat, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { tk } from '@/format';
import { C, S } from '@/theme';
import type { Dish } from '@/types';
import { Button, Card, CategoryTile, Empty, ErrorState, Header, Loading, Row, Screen, T, Toggle } from '@/ui';
import { Grid } from '@/ui/grid';

function MenuItem({ d }: { d: Dish }) {
  const qc = useQueryClient();
  const avail = useMutation({ mutationFn: (v: boolean) => API.saveDish(d.id, { available: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchenDishes'] }) });
  return (
    <Card onPress={() => router.push(`/kitchen/dish/${d.id}`)} style={{ gap: S.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <CategoryTile category={d.category} />
        <View style={{ flex: 1 }}>
          <T v="card" numberOfLines={1}>{d.name}</T>
          <T v="meta">{d.portion} · {d.prepMinutes} min · {d.dailyCapacity}/day</T>
        </View>
        <T v="price">{tk(d.price)}</T>
      </Row>
      <Toggle value={d.available} onChange={(v) => avail.mutate(v)} label={d.available ? 'Cooking today' : 'Hidden today'} sub={`${d.orderCount} sold · ${d.rating ? d.rating.toFixed(1) + '★' : 'no ratings yet'}`} />
    </Card>
  );
}

export default function Menu() {
  const q = useQuery({ queryKey: ['kitchenDishes'], queryFn: API.kitchenDishes });
  const live = (q.data || []).filter((d) => d.available).length;
  return (
    <Screen header={<Header title="Menu" sub={q.data ? `${live} of ${q.data.length} dishes cooking today` : undefined} right={<Button title="Add dish" size="sm" v="secondary" icon={<Plus size={16} color={C.brandText} />} onPress={() => router.push('/kitchen/dish/new')} />} />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.data?.length ? (
        <View style={{ marginTop: S.sm }}><Grid>{q.data.map((d) => <MenuItem key={d.id} d={d} />)}</Grid></View>
      ) : <Empty Icon={ChefHat} title="Your menu is empty" text="Add the dishes you cook best. Customers see them as soon as you switch them on." action="Add your first dish" onAction={() => router.push('/kitchen/dish/new')} />}
    </Screen>
  );
}
