import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, MessageSquarePlus, Search, ShoppingBag, SlidersHorizontal, Truck, UtensilsCrossed } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { useCart } from '@/cart';
import { ACTIVE_STATUSES, firstName, STATUS_LABEL } from '@/format';
import { useAddresses, useAddToCart, useFavorites } from '@/hooks';
import { C, F, MAROON, R, S, shadow } from '@/theme';
import { BatchCard, Card, CookCard, DishCard, FadeIn, IconButton, Loading, Row, Screen, Section, T, Tap } from '@/ui';
import { BrandBar } from '@/ui/brand';
import { SpotlightGrid } from '@/ui/spotlight';
import { KitchenTicker } from '@/ui/kitchenTicker';
import { Grid, useCols } from '@/ui/grid';
import { t, tr, useLang } from '@/i18n';
import { CareRow, FestivalBanner, MotherOfWeek, RegionRow } from '@/ui/maa';

/** A short line for the banner; changes every day. */
const QUOTES = [
  { bn: 'মায়ের হাতের রান্না, এখন আপনার দরজায়', en: 'Homemade, delivered warm' },
  { bn: 'ঘরের খাবার, ভালোবাসায় রান্না', en: 'Cooked with love, not in a factory' },
  { bn: 'আজ কী খেতে মন চায়?', en: 'Tell us what you crave' },
  { bn: 'হোস্টেলে থেকেও মায়ের রান্না', en: 'Home taste, far from home' },
  { bn: 'প্রতিদিন তাজা, প্রতিদিন ঘরোয়া', en: 'Fresh every day' },
];

export default function Home() {
  useLang();
  const { me } = useAuth();
  const cart = useCart();
  const add = useAddToCart();
  const fav = useFavorites();
  const cols = useCols();
  const addresses = useAddresses();
  const addr = addresses.data?.find((a) => a.isDefault) || addresses.data?.[0];
  const area = addr?.area || me?.area || undefined;
  const dishes = useQuery({ queryKey: ['dishes', 'home', area], queryFn: () => API.dishes({ area, take: 30 }) });
  const batches = useQuery({ queryKey: ['batches', 'open', area], queryFn: () => API.batches('open', area) });
  const cooks = useQuery({ queryKey: ['cooks'], queryFn: () => API.cooks() });
  const orders = useQuery({ queryKey: ['orders', 'active'], queryFn: () => API.orders('active'), refetchInterval: 30_000 });
  const requests = useQuery({ queryKey: ['requests'], queryFn: API.requests });
  const home = useQuery({ queryKey: ['home'], queryFn: API.home, staleTime: 5 * 60_000 });
  const care = useQuery({ queryKey: ['dishes', 'care', me?.dietPrefs?.[0]], queryFn: () => API.dishes({ tag: me!.dietPrefs![0], take: 6 }), enabled: !!me?.dietPrefs?.length });
  const notifs = useQuery({ queryKey: ['notifications', 'CUSTOMER'], queryFn: () => API.notifications('CUSTOMER') });

  const active = orders.data?.find((o) => ACTIVE_STATUSES.includes(o.status));
  const openReqs = (requests.data || []).filter((r) => r.status === 'OPEN' || r.status === 'PROPOSALS');
  const waiting = openReqs.reduce((a, r) => a + r.proposals.filter((p) => p.status === 'PENDING').length, 0);
  const groupPrice = new Map((batches.data || []).filter((b) => b.dishId).map((b) => [b.dishId!, b.pricePerPortion]));
  const unread = (notifs.data || []).filter((n) => !n.read).length;
  const quote = QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length];
  const hour = new Date().getHours();
  const refresh = () => { home.refetch(); dishes.refetch(); batches.refetch(); orders.refetch(); requests.refetch(); cooks.refetch(); };

  return (
    <Screen onRefresh={refresh} refreshing={dishes.isRefetching}
      header={<BrandBar right={
        <Row gap={6}>
          <IconButton label="Notifications" badge={unread} onPress={() => router.push('/notifications')}><Bell size={20} color={C.text} /></IconButton>
          <IconButton label="Cart" badge={cart.count} onPress={() => router.push('/cart')}><ShoppingBag size={20} color={C.text} /></IconButton>
        </Row>
      } />}>
      {/* big greeting */}
      <FadeIn>
        <T v="hero" style={{ marginTop: S.sm, fontFamily: F.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}>{tr(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')},{'\n'}<T v="hero" color={C.brand} style={{ fontFamily: F.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 }}>{firstName(me?.name) || tr('friend')}</T></T>
      </FadeIn>

      <Row gap={S.sm} style={{ marginTop: S.lg }}>
        <Tap onPress={() => router.push('/browse')} scale={0.98} style={{ flex: 1, height: 50, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 }}>
          <Search size={19} color={C.muted} />
          <T v="body" color={C.muted} numberOfLines={1}>Search biryani, bhorta, cooks…</T>
        </Tap>
        <Tap label="Filters" onPress={() => router.push('/browse')} scale={0.9} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <SlidersHorizontal size={19} color="#fff" />
        </Tap>
      </Row>

      {/* maroon banner: mothers' kitchens slide in one after another */}
      <KitchenTicker cooks={cooks.data || []} fallback={quote} />

      {/* the two ways to eat, side by side */}
      <Row gap={S.md} style={{ marginTop: S.md, alignItems: 'stretch' }}>
        {/* Order now: white card with a fine gold-to-burgundy outline */}
        <Tap onPress={() => router.push('/browse')} scale={0.97} style={{ flex: 1, borderRadius: R.xl, ...(shadow as object) }}>
          <LinearGradient colors={['#F26A1B', '#F26A1B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: R.xl, padding: 1 }}>
            <View style={{ flex: 1, borderRadius: R.xl - 1, backgroundColor: '#fff', padding: S.md, gap: S.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><UtensilsCrossed size={19} color={C.brand} /></View>
              <View><T v="card" style={{ fontSize: 15 }}>Order now</T><T v="meta" numberOfLines={2}>Ready dishes cooking today</T></View>
            </View>
          </LinearGradient>
        </Tap>
        {/* Request a dish: soft blush gradient */}
        <Tap onPress={() => router.push('/request/new')} scale={0.97} style={{ flex: 1, borderRadius: R.xl, overflow: 'hidden' }}>
          <LinearGradient colors={['#FFF1E8', '#FFF1E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: S.md, gap: S.sm, borderRadius: R.xl, borderWidth: 1, borderColor: '#FAD9C5' }}>
            <View style={{ position: 'absolute', right: -26, top: -26, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.45)' }} />
            <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              <LinearGradient colors={MAROON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ position: 'relative' }}><MessageSquarePlus size={19} color="#fff" /></View>
            </View>
            <View><T v="card" color={C.text} style={{ fontSize: 15 }}>Request a dish</T><T v="meta" color={C.brandText} numberOfLines={2}>Mothers reply with a price</T></View>
          </LinearGradient>
        </Tap>
      </Row>

      {active || openReqs.length ? (
        <FadeIn delay={80} style={{ gap: S.sm, marginTop: S.md }}>
          {active ? (
            <Card white onPress={() => router.push(`/order/${active.id}`)} style={{ padding: S.md, paddingRight: S.lg }}>
              <Row>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.okSoft, alignItems: 'center', justifyContent: 'center' }}><Truck size={20} color={C.ok} /></View>
                <View style={{ flex: 1 }}><T v="card" style={{ fontSize: 15 }}>{STATUS_LABEL[active.status]}</T><T v="meta" numberOfLines={1}>{active.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')} · {active.cook.displayName}</T></View>
                <T v="label" color={C.brandText}>Track</T>
              </Row>
            </Card>
          ) : null}
          {openReqs.length ? (
            <Card white onPress={() => router.push('/requests')} style={{ padding: S.md, paddingRight: S.lg }}>
              <Row>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><MessageSquarePlus size={20} color={C.brand} /></View>
                <View style={{ flex: 1 }}><T v="card" style={{ fontSize: 15 }}>{openReqs.length} open request{openReqs.length > 1 ? 's' : ''}</T><T v="meta">{waiting ? `${waiting} price${waiting > 1 ? 's' : ''} waiting for you` : 'Waiting for mothers to reply'}</T></View>
                {waiting ? <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><T v="meta" color="#fff" style={{ fontFamily: F.bold }}>{waiting}</T></View> : <T v="label" color={C.brandText}>View</T>}
              </Row>
            </Card>
          ) : null}
        </FadeIn>
      ) : null}

      {/* festival pre-orders sit right on top while they're open */}
      {home.data?.festivals.length ? (
        <FadeIn delay={100} style={{ gap: S.md, marginTop: S.lg }}>
          {home.data.festivals.map((f) => <FestivalBanner key={f.id} f={f} />)}
        </FadeIn>
      ) : null}

      <Section title="What are you craving?">
        <SpotlightGrid />
      </Section>

      {home.data?.featured ? (
        <View style={{ marginTop: S.xxl }}>
          <MotherOfWeek c={home.data.featured} />
        </View>
      ) : null}

      <Section title="Available now" sub={area ? `Cooking today near ${area}` : 'Cooking today near you'} action="See all" onAction={() => router.push('/browse')}>
        {dishes.isLoading ? <Loading rows={2} /> : dishes.data?.length ? (
          <Grid>{dishes.data.slice(0, cols === 1 ? 4 : 6).map((d) => <DishCard key={d.id} d={d} onAdd={() => add(d)} saved={fav.dishIds.has(d.id)} onToggleSave={() => fav.toggle({ dishId: d.id })} groupPrice={groupPrice.get(d.id)} />)}</Grid>
        ) : (
          <Card style={{ gap: S.sm }}>
            <T v="card">No kitchens are cooking near you yet</T>
            <T v="sub">Send a request — mothers nearby will reply with a price.</T>
            <Tap onPress={() => router.push('/request/new')} style={{ marginTop: 4 }}><T v="label" color={C.brandText}>Request a dish →</T></Tap>
          </Card>
        )}
      </Section>

      <Section title={t('Health & care', 'স্বাস্থ্য ও যত্ন')} sub={t('Cooked the way a mother cooks for someone unwell, a child or a diabetic', 'অসুস্থ মানুষ, বাচ্চা বা ডায়াবেটিস রোগীর জন্য মা যেভাবে রাঁধেন')}>
        <CareRow mine={me?.dietPrefs} />
        {care.data?.length ? <Grid>{care.data.slice(0, cols === 1 ? 2 : 3).map((d) => <DishCard key={d.id} d={d} onAdd={() => add(d)} saved={fav.dishIds.has(d.id)} onToggleSave={() => fav.toggle({ dishId: d.id })} />)}</Grid> : null}
      </Section>

      {home.data?.regions.length ? (
        <Section title={t('Regional dishes', 'আঞ্চলিক খাবার')} sub={t('Each district’s famous food, cooked by mothers from there', 'প্রতিটি জেলার বিখ্যাত খাবার, সেই জেলার মায়েদের হাতে রান্না')}>
          <RegionRow regions={home.data.regions} />
        </Section>
      ) : null}

      <Section title="Group orders" sub="Join neighbours, share one rider, pay less for delivery." action={batches.data?.length ? 'See all' : undefined} onAction={() => router.push({ pathname: '/browse', params: { tab: 'groups' } })}>
        {batches.data?.length ? <Grid>{batches.data.slice(0, 3).map((b) => <BatchCard key={b.id} b={b} />)}</Grid> : (
          <Card style={{ gap: 4 }}>
            <T v="card" style={{ fontSize: 15 }}>No group orders open right now</T>
            <T v="sub">When a mother near you opens a big pot — like Friday biryani — you can join with your neighbours here.</T>
          </Card>
        )}
      </Section>

      {cooks.data?.length ? (
        <Section title="Verified mothers" sub="Identity and kitchen checked by MaaCrave" action="See all" onAction={() => router.push({ pathname: '/browse', params: { tab: 'cooks' } })}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
            {cooks.data.slice(0, 10).map((c) => <View key={c.id} style={{ width: 286 }}><CookCard c={c} /></View>)}
          </ScrollView>
        </Section>
      ) : null}

      {dishes.data?.some((d) => d.price <= 150) ? (
        <Section title="Under ৳150" sub="Good food on a student budget" action="See all" onAction={() => router.push({ pathname: '/browse', params: { maxPrice: '150' } })}>
          <Grid>{dishes.data.filter((d) => d.price <= 150).slice(0, 3).map((d) => <DishCard key={d.id} d={d} onAdd={() => add(d)} saved={fav.dishIds.has(d.id)} onToggleSave={() => fav.toggle({ dishId: d.id })} />)}</Grid>
        </Section>
      ) : null}
    </Screen>
  );
}
