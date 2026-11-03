import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Clock, Heart, MapPin, MessageSquare, Quote, ShieldCheck, Sparkles, Star, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { API } from '@/api';
import { useAddToCart, useFavorites } from '@/hooks';
import { num, t, useLang } from '@/i18n';
import { bnOf, mediaUrl, REGIONS } from '@/maa';
import { C, R, S, shadow } from '@/theme';
import { Badge, BatchCard, Button, Card, DishCard, ErrorState, Header, IconButton, Loading, Row, Screen, Section, Segmented, T } from '@/ui';
import { Grid } from '@/ui/grid';
import { MotherPhoto } from '@/ui/maa';
import { ReviewList } from '@/ui/reviews';

/** A mother's page: her face, her words, her kitchen, then her menu. */
export default function CookScreen() {
  const lang = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['cook', id], queryFn: () => API.cook(id) });
  const [tab, setTab] = useState<'menu' | 'reviews'>('menu');
  const add = useAddToCart();
  const fav = useFavorites();
  const c = q.data;
  const region = c?.region ? REGIONS[c.region] : null;
  const kitchen = mediaUrl(c?.kitchenPhotoId);
  const months = c?.createdAt ? Math.max(1, Math.round((Date.now() - new Date(c.createdAt).getTime()) / (30 * 86400_000))) : null;

  return (
    <Screen header={<Header back title={c?.displayName || 'Kitchen'} right={c ? (
      <IconButton label="Save cook" onPress={() => fav.toggle({ cookId: c.id })}><Heart size={22} color={fav.cookIds.has(c.id) ? C.brand : C.text} fill={fav.cookIds.has(c.id) ? C.brand : 'transparent'} /></IconButton>
    ) : undefined} />} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : q.error || !c ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          {/* hero: clean white card, her portrait in a mango ring */}
          <View style={{ marginTop: S.sm, borderRadius: R.xl, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...(shadow as object) }}>
            <LinearGradient colors={['#F5B942', '#C2441F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />
            <View style={{ padding: S.lg, gap: S.md, alignItems: 'center' }}>
              <MotherPhoto c={c} size={92} />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Row gap={6}><T v="title" style={{ flexShrink: 1, textAlign: 'center' }}>{c.displayName}</T><BadgeCheck size={20} color={C.brand} /></Row>
                {region ? <T v="label" color={C.brandText} bn={lang === 'bn'}>{lang === 'bn' ? `${bnOf(region.bn)} রান্না` : `Cooks the ${region.en} way`}</T> : null}
                <Row gap={S.md} wrap style={{ justifyContent: 'center' }}>
                  <Row gap={4}><MapPin size={13} color={C.muted} /><T v="meta">{c.area}</T></Row>
                  <Row gap={4}><Clock size={13} color={C.muted} /><T v="meta">{c.hours}</T></Row>
                </Row>
              </View>
              <Row gap={S.sm} style={{ alignSelf: 'stretch' }}>
                {[
                  { k: c.ratingCount ? num(c.rating.toFixed(1)) : '—', l: t(`${c.ratingCount} reviews`, `${num(c.ratingCount)} রিভিউ`), Icon: Star },
                  { k: num(c.completedOrders), l: t('meals cooked', 'বার রান্না'), Icon: Utensils },
                  { k: months ? num(months) : '—', l: t('months with us', 'মাস সাথে'), Icon: Sparkles },
                ].map((x) => (
                  <View key={x.l} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: R.md, backgroundColor: C.surface2 }}>
                    <x.Icon size={14} color={C.brand} />
                    <T v="price">{x.k}</T>
                    <T v="meta" numberOfLines={1}>{x.l}</T>
                  </View>
                ))}
              </Row>
            </View>
          </View>

          {/* her story, in her words */}
          {c.story || c.intro ? (
            <View style={{ marginTop: S.lg, backgroundColor: C.surface, borderRadius: R.xl, padding: S.lg, gap: S.sm, borderWidth: 1, borderColor: C.line, borderLeftWidth: 3, borderLeftColor: C.brand }}>
              <Row gap={6}><Quote size={16} color={C.brand} /><T v="eyebrow" color={C.brand} bn={lang === 'bn'}>{t('Her story', 'মায়ের গল্প')}</T></Row>
              <T v="body" color={C.text} style={{ fontStyle: c.story ? 'italic' : 'normal' }}>{c.story || c.intro}</T>
              {c.story && c.intro ? <T v="sub" color={C.text2}>{c.intro}</T> : null}
            </View>
          ) : null}

          {/* her kitchen */}
          {kitchen ? (
            <View style={{ marginTop: S.lg, gap: S.sm }}>
              <T v="eyebrow" bn={lang === 'bn'}>{t('Her kitchen', 'ওনার রান্নাঘর')}</T>
              <Image source={{ uri: kitchen }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: R.xl, backgroundColor: C.sunken }} resizeMode="cover" />
            </View>
          ) : null}

          <Row gap={S.sm} wrap style={{ marginTop: S.lg }}>
            <Badge tone="ok" label="Verified kitchen" icon={<ShieldCheck size={12} color={C.ok} />} />
            {c.accepting ? <Badge tone="brand" label="Taking orders" /> : <Badge label="Closed now" />}
            {c.specialties.map((s) => <Badge key={s} label={s} />)}
          </Row>

          <Card style={{ marginTop: S.lg, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <MessageSquare size={20} color={C.brandText} />
            <T v="sub" style={{ flex: 1 }}>{t(`Want something not on the menu? Send a request — ${c.displayName.split(' ')[0]} and other mothers can reply with a price.`, `মেনুতে নেই এমন কিছু চান? রিকোয়েস্ট পাঠান, ${c.displayName.split(' ')[0]} ও অন্য মায়েরা দাম জানাবেন।`)}</T>
            <Button title="Request" size="sm" v="secondary" onPress={() => router.push('/request/new')} />
          </Card>

          {c.openBatches.length ? (
            <Section title="Group orders">
              <Grid>{c.openBatches.map((b) => <BatchCard key={b.id} b={b} />)}</Grid>
            </Section>
          ) : null}

          <View style={{ marginTop: S.x3 }}>
            <Segmented value={tab} onChange={setTab} items={[{ key: 'menu', label: `${t('Menu', 'মেনু')} (${num(c.dishes.length)})` }, { key: 'reviews', label: `${t('Reviews', 'রিভিউ')} (${num(c.ratingCount)})` }]} />
          </View>
          <View style={{ marginTop: S.lg, marginBottom: S.lg }}>
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
