import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Clock, Heart, MapPin, MessageSquare, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { useAddToCart, useFavorites } from '@/hooks';
import { C, S } from '@/theme';
import { Avatar, Badge, BatchCard, Button, Card, DishCard, ErrorState, Header, IconButton, Loading, Rating, Row, Screen, Section, Segmented, T } from '@/ui';
import { Grid } from '@/ui/grid';
import { ReviewList } from '@/ui/reviews';

export default function CookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['cook', id], queryFn: () => API.cook(id) });
  const [tab, setTab] = useState<'menu' | 'reviews'>('menu');
  const add = useAddToCart();
  const fav = useFavorites();
  const c = q.data;

  return (
    <Screen header={<Header back title={c?.displayName || 'Kitchen'} right={c ? (
      <IconButton label="Save cook" onPress={() => fav.toggle({ cookId: c.id })}><Heart size={22} color={fav.cookIds.has(c.id) ? C.brand : C.text} fill={fav.cookIds.has(c.id) ? C.brand : 'transparent'} /></IconButton>
    ) : undefined} />} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : q.error || !c ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Row style={{ gap: S.lg, marginTop: S.sm }}>
            <Avatar name={c.displayName} size={72} />
            <View style={{ flex: 1, gap: 4 }}>
              <Row gap={6}><T v="title" style={{ flexShrink: 1 }}>{c.displayName}</T><BadgeCheck size={20} color={C.brand} /></Row>
              <Row gap={8} wrap><Rating value={c.rating} count={c.ratingCount} /><T v="meta">· {c.completedOrders} orders</T></Row>
              <Row gap={S.md} wrap>
                <Row gap={4}><MapPin size={14} color={C.muted} /><T v="meta">{c.area}</T></Row>
                <Row gap={4}><Clock size={14} color={C.muted} /><T v="meta">{c.hours}</T></Row>
              </Row>
            </View>
          </Row>
          {c.intro ? <T v="body" color={C.text2} style={{ marginTop: S.lg }}>{c.intro}</T> : null}
          <Row gap={S.sm} wrap style={{ marginTop: S.md }}>
            <Badge tone="ok" label="Verified kitchen" icon={<ShieldCheck size={12} color={C.ok} />} />
            {c.accepting ? <Badge tone="brand" label="Taking orders" /> : <Badge label="Closed now" />}
            {c.specialties.map((s) => <Badge key={s} label={s} />)}
          </Row>
          <Card style={{ marginTop: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <MessageSquare size={20} color={C.brandText} />
            <T v="sub" style={{ flex: 1 }}>Want something not on the menu? Send a request — {c.displayName.split(' ')[0]} and other mothers can reply with a price.</T>
            <Button title="Request" size="sm" v="secondary" onPress={() => router.push('/request/new')} />
          </Card>

          {c.openBatches.length ? (
            <Section title="Group orders">
              <Grid>{c.openBatches.map((b) => <BatchCard key={b.id} b={b} />)}</Grid>
            </Section>
          ) : null}

          <View style={{ marginTop: S.x3 }}>
            <Segmented value={tab} onChange={setTab} items={[{ key: 'menu', label: `Menu (${c.dishes.length})` }, { key: 'reviews', label: `Reviews (${c.ratingCount})` }]} />
          </View>
          <View style={{ marginTop: S.lg }}>
            {tab === 'menu' ? (
              c.dishes.length ? <Grid>{c.dishes.map((d) => <DishCard key={d.id} d={{ ...d, cook: c }} onAdd={c.accepting ? () => add({ ...d, cook: c }) : undefined} saved={fav.dishIds.has(d.id)} onToggleSave={() => fav.toggle({ dishId: d.id })} />)}</Grid>
                : <T v="sub">No dishes listed yet.</T>
            ) : <ReviewList reviews={c.reviews} />}
          </View>
        </>
      )}
    </Screen>
  );
}
