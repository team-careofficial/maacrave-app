import { Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useAddToCart, useFavorites } from '@/hooks';
import { S } from '@/theme';
import { CookCard, DishCard, Empty, Header, Loading, Screen, Section } from '@/ui';
import { Grid } from '@/ui/grid';

export default function Favorites() {
  const fav = useFavorites();
  const add = useAddToCart();
  const dishes = (fav.data || []).map((f) => f.dish).filter(Boolean) as NonNullable<NonNullable<typeof fav.data>[number]['dish']>[];
  const cooks = (fav.data || []).map((f) => f.cook).filter(Boolean) as NonNullable<NonNullable<typeof fav.data>[number]['cook']>[];
  return (
    <Screen header={<Header back title="Saved" />} onRefresh={fav.refetch}>
      {fav.isLoading ? <Loading /> : !dishes.length && !cooks.length ? (
        <Empty Icon={Heart} title="Nothing saved yet" text="Tap the heart on a dish or kitchen to find it quickly next time." action="Browse food" onAction={() => router.push('/browse')} />
      ) : (
        <View style={{ marginTop: -S.lg }}>
          {dishes.length ? <Section title="Dishes"><Grid>{dishes.map((d) => <DishCard key={d.id} d={d} saved onToggleSave={() => fav.toggle({ dishId: d.id })} onAdd={() => add(d)} />)}</Grid></Section> : null}
          {cooks.length ? <Section title="Kitchens"><Grid>{cooks.map((c) => <CookCard key={c.id} c={c} />)}</Grid></Section> : null}
        </View>
      )}
    </Screen>
  );
}
