import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, BadgeCheck, Clock, Flame, Heart, ShoppingBag, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { useAuth } from '@/auth';
import { allergyHits, mediaUrl, regionOf } from '@/maa';
import { AllergyNote, HealthPills, MotherPhoto, RegionPill } from '@/ui/maa';
import { API } from '@/api';
import { useCart } from '@/cart';
import { tk } from '@/format';
import { useAddToCart, useFavorites } from '@/hooks';
import { C, CATEGORY_META, ON_GLOSS, ON_GLOSS_SOFT, R, S } from '@/theme';
import { Avatar, Button, Card, CategoryTile, Glossy, Rings, Divider, ErrorState, Header, IconButton, Loading, Note, Rating, Row, Screen, Section, Stepper, T } from '@/ui';
import { ReviewList } from '@/ui/reviews';

export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['dish', id], queryFn: () => API.dish(id) });
  const [qty, setQty] = useState(1);
  const add = useAddToCart();
  const cart = useCart();
  const fav = useFavorites();
  const d = q.data;
  const { me } = useAuth();
  const photo = mediaUrl(d?.photoId);
  const hits = d ? allergyHits(d, me?.allergies) : [];

  return (
    <Screen
      header={<Header back title={d?.name || 'Dish'} right={
        <Row gap={4}>
          {d ? <IconButton label="Save" onPress={() => fav.toggle({ dishId: d.id })}><Heart size={22} color={fav.dishIds.has(d.id) ? C.brand : C.text} fill={fav.dishIds.has(d.id) ? C.brand : 'transparent'} /></IconButton> : null}
          <IconButton label="Cart" badge={cart.count} onPress={() => router.push('/cart')}><ShoppingBag size={22} color={C.text} /></IconButton>
        </Row>} />}
      footer={d ? (
        <>
          <Stepper value={qty} onChange={setQty} max={Math.max(1, d.dailyCapacity)} />
          <Button title={d.available ? `Add to cart · ${tk(d.price * qty)}` : 'Not cooking today'} disabled={!d.available || !d.cook?.accepting} size="lg" style={{ flex: 1 }}
            onPress={async () => { await add(d, qty); }} />
        </>
      ) : undefined}>
      {q.isLoading ? <Loading /> : q.error || !d ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <View style={{ gap: S.lg }}>
          {photo ? (
            <View style={{ marginTop: S.sm, borderRadius: 30, overflow: 'hidden', backgroundColor: C.sunken }}>
              <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" accessibilityLabel={d.name} />
              <View style={{ position: 'absolute', left: S.lg, top: S.lg, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: R.pill, paddingHorizontal: 12, height: 28, justifyContent: 'center' }}>
                <T v="eyebrow" color={ON_GLOSS}>{CATEGORY_META[d.category]?.label || d.category}</T>
              </View>
              <View style={{ position: 'absolute', right: S.md, bottom: S.md, backgroundColor: 'rgba(46,29,20,0.6)', borderRadius: R.pill, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
                <T v="meta" color="#fff">{d.cook ? `📷 ${d.cook.displayName.split(' ')[0]}` : '📷'}</T>
              </View>
            </View>
          ) : (
          <Glossy style={{ marginTop: S.sm }} radius={30}>
            <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
              <Rings size={340} right={-60} top={-70} />
              <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                  <CategoryTile category={d.category} size={76} solid />
                </View>
              </View>
              <View style={{ position: 'absolute', left: S.lg, top: S.lg, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: R.pill, paddingHorizontal: 12, height: 28, justifyContent: 'center' }}>
                <T v="eyebrow" color={ON_GLOSS}>{CATEGORY_META[d.category]?.label || d.category}</T>
              </View>
            </View>
          </Glossy>
          )}
          <View style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T v="title">{d.name}</T>
                {d.nameBn ? <T v="body" bn color={C.text2}>{d.nameBn}</T> : null}
              </View>
              <T v="big" color={C.brand}>{tk(d.price)}</T>
            </Row>
            <Row gap={10} wrap>
              <Rating value={d.rating} count={d.ratingCount} />
              <Row gap={3}><Clock size={14} color={C.muted} /><T v="meta">{d.prepMinutes + 20} min</T></Row>
              <T v="meta">{d.portion}</T>
              <T v="meta">{d.orderCount} ordered</T>
              {d.spice ? <Row gap={1}>{Array.from({ length: d.spice }).map((_, i) => <Flame key={i} size={13} color={C.err} />)}</Row> : null}
            </Row>
          </View>
          {(d.healthTags?.length || regionOf(d)) ? <View style={{ gap: 6 }}><RegionPill region={regionOf(d)} /><HealthPills tags={d.healthTags} max={6} /></View> : null}
          <AllergyNote hits={hits} />
          {d.description ? <T v="body" color={C.text2}>{d.description}</T> : null}

          {d.openBatch ? (
            <Card accent style={{ gap: S.sm, backgroundColor: C.brandSoft }}>
              <Row><Users size={18} color={C.brandText} /><T v="label" color={C.brandText} style={{ flex: 1 }}>Group order open — {tk(d.openBatch.pricePerPortion)} per portion and cheaper delivery</T></Row>
              <Button title="See group order" v="dark" size="sm" onPress={() => router.push(`/batch/${d.openBatch!.id}`)} style={{ alignSelf: 'flex-start' }} />
            </Card>
          ) : null}

          {d.cook ? (
            <Card onPress={() => router.push(`/cook/${d.cook!.id}`)}>
              <Row>
                <MotherPhoto c={d.cook} size={44} />
                <View style={{ flex: 1 }}>
                  <Row gap={4}><T v="card">{d.cook.displayName}</T><BadgeCheck size={15} color={C.brand} /></Row>
                  <T v="meta">{d.cook.area} · {d.cook.completedOrders} orders · {d.cook.hours}</T>
                </View>
                <T v="label" color={C.brandText}>Kitchen</T>
              </Row>
            </Card>
          ) : null}

          {d.ingredients.length ? (
            <Section title="Ingredients" style={{ marginTop: S.sm }}>
              <Row gap={S.sm} wrap>{d.ingredients.map((i) => <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: C.surface2 }}><T v="meta" color={C.text2}>{i}</T></View>)}</Row>
            </Section>
          ) : null}
          {d.allergens.length ? <Note tone="warn"><Row gap={8}><AlertTriangle size={16} color={C.warn} /><T v="sub" color={C.warn} style={{ flex: 1 }}>Contains {d.allergens.join(', ')}. Add allergy notes at checkout.</T></Row></Note> : null}
          {!d.cook?.accepting ? <Note>This kitchen isn’t taking orders right now. Save the dish and check back later.</Note> : null}

          <Divider />
          <Section title="Reviews" sub={d.ratingCount ? `${d.rating.toFixed(1)} from ${d.ratingCount} ratings` : undefined} style={{ marginTop: 0 }}>
            <ReviewList reviews={d.reviews} />
          </Section>
        </View>
      )}
    </Screen>
  );
}
