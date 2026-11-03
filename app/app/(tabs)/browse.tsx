import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChefHat, Search, Users, Utensils, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { API } from '@/api';
import { useAddToCart, useFavorites } from '@/hooks';
import { C, CATEGORY_META, F, S } from '@/theme';
import { BatchCard, Chip, CookCard, DishCard, Empty, ErrorState, Header, Loading, Row, Screen, Segmented, T } from '@/ui';
import { Grid } from '@/ui/grid';
import { useAuth } from '@/auth';
import { t, useLang } from '@/i18n';
import { allergyHits, bnOf, HEALTH, REGIONS } from '@/maa';
import { Stitch } from '@/ui/maa';

type Tab = 'dishes' | 'groups' | 'cooks';
const SORTS = [{ key: 'popular', label: 'Popular' }, { key: 'rating', label: 'Top rated' }, { key: 'price', label: 'Lowest price' }, { key: 'fast', label: 'Fastest' }];

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export default function Browse() {
  const lang = useLang();
  const { me } = useAuth();
  const p = useLocalSearchParams<{ tab?: Tab; category?: string; maxPrice?: string; region?: string; tag?: string }>();
  const [region, setRegion] = useState<string | undefined>(p.region);
  const [tag, setTag] = useState<string | undefined>(p.tag);
  const [safe, setSafe] = useState(false);
  useEffect(() => { if (p.region) { setRegion(p.region); setTab('dishes'); } if (p.tag) { setTag(p.tag); setTab('dishes'); } }, [p.region, p.tag]);
  const [tab, setTab] = useState<Tab>(p.tab || 'dishes');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | undefined>(p.category);
  const [sort, setSort] = useState('popular');
  const [maxPrice, setMaxPrice] = useState<number | undefined>(p.maxPrice ? Number(p.maxPrice) : undefined);
  useEffect(() => { if (p.tab) setTab(p.tab); if (p.category) setCategory(p.category); if (p.maxPrice) setMaxPrice(Number(p.maxPrice)); }, [p.tab, p.category, p.maxPrice]);
  const dq = useDebounced(q.trim());
  const add = useAddToCart();
  const fav = useFavorites();

  const dishes = useQuery({ queryKey: ['dishes', dq, category, sort, maxPrice, region, tag], queryFn: () => API.dishes({ q: dq || undefined, category, sort, maxPrice, region, tag, take: 60 }), enabled: tab === 'dishes' });
  const shown = (dishes.data || []).filter((d) => !safe || !allergyHits(d, me?.allergies).length);
  const r = region ? REGIONS[region] : null;
  const batches = useQuery({ queryKey: ['batches', 'open'], queryFn: () => API.batches('open'), enabled: tab === 'groups' });
  const cooks = useQuery({ queryKey: ['cooks', dq], queryFn: () => API.cooks(dq || undefined), enabled: tab === 'cooks' });
  const groups = (batches.data || []).filter((b) => !dq || (b.title + ' ' + b.cook?.displayName + ' ' + b.area).toLowerCase().includes(dq.toLowerCase()));

  return (
    <Screen header={<Header title="Browse" sub="Homemade food from verified mothers" />}
      onRefresh={() => (tab === 'dishes' ? dishes.refetch() : tab === 'groups' ? batches.refetch() : cooks.refetch())}>
      <View style={{ height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.line2, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: 14 }}>
        <Search size={20} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder={tab === 'cooks' ? 'Search cooks or areas' : 'Search dishes, cooks or areas'} placeholderTextColor={C.muted}
          returnKeyType="search" style={{ flex: 1, fontFamily: F.regular, fontSize: 15, color: C.text, height: 48 }} accessibilityLabel="Search" />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Clear search"><X size={18} color={C.muted} /></Pressable> : null}
      </View>

      <View style={{ marginTop: S.md }}>
        <Segmented<Tab> value={tab} onChange={setTab} items={[{ key: 'dishes', label: 'Available now' }, { key: 'groups', label: 'Group orders' }, { key: 'cooks', label: 'Cooks' }]} />
      </View>

      {tab === 'dishes' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.md, marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
            <Chip label="All" on={!category} onPress={() => setCategory(undefined)} />
            {Object.entries(CATEGORY_META).map(([k, m]) => <Chip key={k} label={m.label} on={category === k} onPress={() => setCategory(category === k ? undefined : k)} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm, marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
            {SORTS.map((s) => <Chip key={s.key} label={s.label} on={sort === s.key} onPress={() => setSort(s.key)} />)}
            <Chip label="Under ৳150" on={maxPrice === 150} onPress={() => setMaxPrice(maxPrice === 150 ? undefined : 150)} />
            {me?.allergies?.length ? <Chip label={t('Safe for me', 'আমার জন্য নিরাপদ')} on={safe} onPress={() => setSafe(!safe)} /> : null}
          </ScrollView>
          {/* care: diabetic, low oil, for kids… */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm, marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
            {Object.entries(HEALTH).map(([k, h]) => <Chip key={k} label={lang === 'bn' ? h.bn : h.en} on={tag === k} onPress={() => setTag(tag === k ? undefined : k)} />)}
          </ScrollView>
          {/* home districts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm, marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
            {Object.entries(REGIONS).map(([k, x]) => <Chip key={k} label={`📍 ${lang === 'bn' ? x.bn : x.en}`} on={region === k} onPress={() => setRegion(region === k ? undefined : k)} />)}
          </ScrollView>
          {r ? (
            <View style={{ marginTop: S.md, borderRadius: 20, padding: S.lg, gap: 6, backgroundColor: C.turmericSoft, borderLeftWidth: 4, borderLeftColor: r.tint }}>
              <T v="eyebrow" color={C.brand} bn={lang === 'bn'}>{t('A taste of home', 'নিজের জেলার স্বাদ')}</T>
              <T v="section" color={r.tint} bn>{r.bn}</T>
              <T v="sub" color={C.onTurmeric}>{t(`Mothers from ${r.en} cooking ${r.known.toLowerCase()} and more, here in Dhaka.`, `${bnOf(r.bn)} মায়েরা ঢাকায় বসেই রান্না করছেন ${r.knownBn} আর আরও অনেক কিছু।`)}</T>
              <Stitch color={r.tint} style={{ marginTop: 4 }} />
            </View>
          ) : null}
          <Row style={{ marginTop: S.lg, marginBottom: S.md, justifyContent: 'space-between' }}>
            <T v="label" color={C.text2}>{dishes.data ? `${shown.length} dish${shown.length === 1 ? '' : 'es'}` : ' '}</T>
          </Row>
          {dishes.isLoading ? <Loading /> : dishes.error ? <ErrorState error={dishes.error} onRetry={dishes.refetch} /> : shown.length ? (
            <Grid>{shown.map((d) => <DishCard key={d.id} d={d} onAdd={() => add(d)} saved={fav.dishIds.has(d.id)} onToggleSave={() => fav.toggle({ dishId: d.id })} />)}</Grid>
          ) : <Empty Icon={Utensils} title="Nothing matches yet" text="Try another category, or request this dish and mothers nearby will reply with a price." action="Request a dish" onAction={() => router.push('/request/new')} />}
        </>
      ) : null}

      {tab === 'groups' ? (
        <View style={{ marginTop: S.lg }}>
          <T v="sub" style={{ marginBottom: S.md }}>Neighbours share one cooking batch and one rider, so everyone pays less for delivery. If the minimum isn’t reached, nobody is charged.</T>
          {batches.isLoading ? <Loading /> : batches.error ? <ErrorState error={batches.error} onRetry={batches.refetch} /> : groups.length ? (
            <Grid>{groups.map((b) => <BatchCard key={b.id} b={b} />)}</Grid>
          ) : <Empty Icon={Users} title="No open group orders" text="When a mother opens a group batch near you, it will show up here." />}
        </View>
      ) : null}

      {tab === 'cooks' ? (
        <View style={{ marginTop: S.lg }}>
          {cooks.isLoading ? <Loading /> : cooks.error ? <ErrorState error={cooks.error} onRetry={cooks.refetch} /> : cooks.data?.length ? (
            <Grid>{cooks.data.map((c) => <CookCard key={c.id} c={c} />)}</Grid>
          ) : <Empty Icon={ChefHat} title="No cooks found" text="Try a different name or area." />}
        </View>
      ) : null}
    </Screen>
  );
}
