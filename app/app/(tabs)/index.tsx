import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowUpRight, Bell, ChevronDown, MapPin, MessageSquarePlus, Search, ShoppingBag, SlidersHorizontal, Truck, Utensils } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { useCart } from '@/cart';
import { ACTIVE_STATUSES, firstName, STATUS_LABEL } from '@/format';
import { useAddresses, useAddToCart, useFavorites } from '@/hooks';
import { C, CATEGORY_META, F, R, S } from '@/theme';
import { BatchCard, Card, CategoryTile, CookCard, DishCard, FadeIn, Glossy, IconButton, Loading, Matte, Rings, Row, Screen, Section, T, Tap } from '@/ui';
import { Grid, useCols } from '@/ui/grid';

export default function Home() {
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
  const hour = new Date().getHours();
  const unread = (notifs.data || []).filter((n) => !n.read).length;
  const refresh = () => { dishes.refetch(); batches.refetch(); orders.refetch(); requests.refetch(); cooks.refetch(); };
  const wide = cols > 1;

  return (
    <Screen onRefresh={refresh} refreshing={dishes.isRefetching}
      header={
        <View style={{ paddingHorizontal: S.lg, paddingVertical: S.sm, width: '100%', maxWidth: 1080, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Tap onPress={() => router.push('/addresses')} style={{ flex: 1 }}>
            <T v="meta">Deliver to</T>
            <Row gap={5} style={{ marginTop: 2 }}>
              <MapPin size={16} color={C.brand} />
              <T v="card" numberOfLines={1} style={{ flexShrink: 1 }}>{addr ? `${addr.label}, ${addr.area}` : 'Add your address'}</T>
              <ChevronDown size={16} color={C.text} />
            </Row>
          </Tap>
          <IconButton label="Notifications" badge={unread} onPress={() => router.push('/notifications')}><Bell size={20} color={C.text} /></IconButton>
          <IconButton label="Cart" badge={cart.count} onPress={() => router.push('/cart')}><ShoppingBag size={20} color={C.text} /></IconButton>
        </View>
      }>
      <FadeIn>
        <T v="hero" style={{ marginTop: S.sm }}>{hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'},{'\n'}<T v="hero" color={C.brand}>{firstName(me?.name) || 'friend'}</T></T>
      </FadeIn>

      <Row gap={S.sm} style={{ marginTop: S.lg }}>
        <Tap onPress={() => router.push('/browse')} scale={0.98} style={{ flex: 1, height: 52, borderRadius: R.pill, backgroundColor: C.surface2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 }}>
          <Search size={19} color={C.muted} />
          <T v="body" color={C.muted} numberOfLines={1}>Search biryani, bhorta, cooks…</T>
        </Tap>
        <Tap label="Filters" onPress={() => router.push('/browse')} scale={0.9} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
          <SlidersHorizontal size={19} color="#fff" />
        </Tap>
      </Row>

      {/* The two ways to eat: order what's cooking, or ask for what you crave */}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: S.md, marginTop: S.lg }}>
        <Glossy onPress={() => router.push('/browse')} style={{ flex: wide ? 1.3 : undefined }}>
          <View style={{ padding: S.xl, minHeight: wide ? 200 : 168, justifyContent: 'space-between' }}>
            <Rings size={230} right={-70} top={-60} />
            <View style={{ position: 'absolute', right: 22, bottom: 22, width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={34} color="#fff" strokeWidth={1.7} />
            </View>
            <View style={{ gap: 6, maxWidth: '72%' }}>
              <T v="eyebrow" color="rgba(255,255,255,0.8)">Cooking today</T>
              <T v="title" color="#fff" style={{ fontSize: 28, lineHeight: 32 }}>Homemade meals, ready near you</T>
            </View>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: R.pill, paddingHorizontal: 18, height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: S.lg }}>
              <T v="label" color={C.brand}>Order now</T><ArrowUpRight size={16} color={C.brand} />
            </View>
          </View>
        </Glossy>
        <Matte onPress={() => router.push('/request/new')} style={{ flex: wide ? 1 : undefined }}>
          <View style={{ padding: S.xl, minHeight: wide ? 200 : 132, justifyContent: 'space-between', gap: S.md }}>
            <Rings size={160} right={-50} top={-50} color="#E2373C" />
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <T v="eyebrow" color="#F29A9C">Can’t find it?</T>
                <T v="section" color="#fff" style={{ fontSize: 22, lineHeight: 27 }}>Request a dish</T>
                <T v="sub" color="rgba(255,255,255,0.72)">Tell mothers what you crave — they reply with a price.</T>
              </View>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}><MessageSquarePlus size={21} color="#fff" /></View>
            </Row>
          </View>
        </Matte>
      </View>

      {active || openReqs.length ? (
        <FadeIn delay={80} style={{ gap: S.sm, marginTop: S.lg }}>
          {active ? (
            <Card white onPress={() => router.push(`/order/${active.id}`)} style={{ padding: S.md, paddingRight: S.lg }}>
              <Row>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.okSoft, alignItems: 'center', justifyContent: 'center' }}><Truck size={20} color={C.ok} /></View>
                <View style={{ flex: 1 }}><T v="card" style={{ fontSize: 15 }}>{STATUS_LABEL[active.status]}</T><T v="meta" numberOfLines={1}>{active.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')} · {active.cook.displayName}</T></View>
                <T v="label" color={C.brandText}>Track</T>
              </Row>
            </Card>
          ) : null}
          {openReqs.length ? (
            <Card white onPress={() => router.push('/requests')} style={{ padding: S.md, paddingRight: S.lg }}>
              <Row>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><MessageSquarePlus size={20} color={C.brand} /></View>
                <View style={{ flex: 1 }}><T v="card" style={{ fontSize: 15 }}>{openReqs.length} open request{openReqs.length > 1 ? 's' : ''}</T><T v="meta">{waiting ? `${waiting} price${waiting > 1 ? 's' : ''} waiting for you` : 'Waiting for mothers to reply'}</T></View>
                {waiting ? <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><T v="meta" color="#fff" style={{ fontFamily: F.bold }}>{waiting}</T></View> : <T v="label" color={C.brandText}>View</T>}
              </Row>
            </Card>
          ) : null}
        </FadeIn>
      ) : null}

      <Section title="What are you craving?">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
          {Object.entries(CATEGORY_META).map(([k, m]) => (
            <Tap key={k} onPress={() => router.push({ pathname: '/browse', params: { category: k } })} scale={0.92} style={{ width: 78, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 70, height: 70, borderRadius: 24, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}><CategoryTile category={k} size={48} solid /></View>
              <T v="meta" center color={C.text2} numberOfLines={2} style={{ fontFamily: F.semibold }}>{m.label}</T>
            </Tap>
          ))}
        </ScrollView>
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

      {batches.data?.length ? (
        <Section title="Group orders" sub="Join neighbours, share one rider, pay less for delivery." action="See all" onAction={() => router.push({ pathname: '/browse', params: { tab: 'groups' } })}>
          <Grid>{batches.data.slice(0, 3).map((b) => <BatchCard key={b.id} b={b} />)}</Grid>
        </Section>
      ) : null}

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
