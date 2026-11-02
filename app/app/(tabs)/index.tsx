import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight, Bell, MessageSquarePlus, Search, ShoppingBag, SlidersHorizontal, Truck, UtensilsCrossed } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { useCart } from '@/cart';
import { ACTIVE_STATUSES, firstName, STATUS_LABEL } from '@/format';
import { useAddresses, useAddToCart, useFavorites } from '@/hooks';
import { C, F, R, S } from '@/theme';
import { BatchCard, Card, CookCard, DishCard, FadeIn, Glossy, IconButton, Loading, Rings, Row, Screen, Section, T, Tap } from '@/ui';
import { BrandBar } from '@/ui/brand';
import { SpotlightGrid } from '@/ui/spotlight';
import { Grid, useCols } from '@/ui/grid';
import { tr, useLang } from '@/i18n';

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
  const notifs = useQuery({ queryKey: ['notifications', 'CUSTOMER'], queryFn: () => API.notifications('CUSTOMER') });

  const active = orders.data?.find((o) => ACTIVE_STATUSES.includes(o.status));
  const openReqs = (requests.data || []).filter((r) => r.status === 'OPEN' || r.status === 'PROPOSALS');
  const waiting = openReqs.reduce((a, r) => a + r.proposals.filter((p) => p.status === 'PENDING').length, 0);
  const groupPrice = new Map((batches.data || []).filter((b) => b.dishId).map((b) => [b.dishId!, b.pricePerPortion]));
  const unread = (notifs.data || []).filter((n) => !n.read).length;
  const quote = QUOTES[Math.floor(Date.now() / 86_400_000) % QUOTES.length];
  const hour = new Date().getHours();
  const refresh = () => { dishes.refetch(); batches.refetch(); orders.refetch(); requests.refetch(); cooks.refetch(); };

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
        <T v="hero" style={{ marginTop: S.sm, fontSize: 32, lineHeight: 38 }}>{tr(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')},{'\n'}<T v="hero" color={C.brand} style={{ fontSize: 32, lineHeight: 38 }}>{firstName(me?.name) || tr('friend')}</T></T>
      </FadeIn>

      <Row gap={S.sm} style={{ marginTop: S.md }}>
        <Tap onPress={() => router.push('/browse')} scale={0.98} style={{ flex: 1, height: 50, borderRadius: R.pill, backgroundColor: C.surface2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 }}>
          <Search size={19} color={C.muted} />
          <T v="body" color={C.muted} numberOfLines={1}>Search biryani, bhorta, cooks…</T>
        </Tap>
        <Tap label="Filters" onPress={() => router.push('/browse')} scale={0.9} style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <SlidersHorizontal size={19} color="#fff" />
        </Tap>
      </Row>

      {/* slim banner: line of the day + Explore */}
      <Glossy style={{ marginTop: S.lg }} radius={22} glow={false}>
        <View style={{ paddingVertical: S.lg, paddingHorizontal: S.xl, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Rings size={190} right={-60} top={-70} />
          <View style={{ flex: 1, gap: 4 }}>
            <T v="card" bn color="#fff" style={{ fontFamily: F.bnBold, fontSize: 18, lineHeight: 26 }}>{quote.bn}</T>
            <T v="meta" color="rgba(255,255,255,0.8)">{quote.en}</T>
          </View>
          <Tap onPress={() => router.push('/browse')} scale={0.92} style={{ backgroundColor: '#fff', borderRadius: R.pill, height: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T v="label" color={C.brand}>Explore</T><ArrowRight size={15} color={C.brand} />
          </Tap>
        </View>
      </Glossy>

      {/* the two ways to eat, side by side */}
      <Row gap={S.md} style={{ marginTop: S.md, alignItems: 'stretch' }}>
        <Card onPress={() => router.push('/browse')} style={{ flex: 1, padding: S.md, gap: S.sm }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}><UtensilsCrossed size={19} color={C.brand} /></View>
          <View><T v="card" style={{ fontSize: 15 }}>Order now</T><T v="meta" numberOfLines={2}>Ready dishes cooking today</T></View>
        </Card>
        <Card onPress={() => router.push('/request/new')} style={{ flex: 1, padding: S.md, gap: S.sm, backgroundColor: '#FBE6E6' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}><MessageSquarePlus size={19} color="#fff" /></View>
          <View><T v="card" color={C.brandDark} style={{ fontSize: 15 }}>Request a dish</T><T v="meta" color={C.brandText} numberOfLines={2}>Mothers reply with a price</T></View>
        </Card>
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

      <Section title="What are you craving?" style={{ marginTop: S.xl }}>
        <SpotlightGrid />
      </Section>

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
