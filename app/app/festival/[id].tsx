import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarHeart, PartyPopper, Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { API } from '@/api';
import { useAddToCart, useFavorites } from '@/hooks';
import { num, t, useLang } from '@/i18n';
import { festDay } from '@/maa';
import { C, F, R, S } from '@/theme';
import { DishCard, Empty, ErrorState, Header, Loading, Note, Row, Screen, T } from '@/ui';
import { Grid } from '@/ui/grid';
import { Countdown, Stitch } from '@/ui/maa';


/** One festival's pre-order menu: Eid, Pohela Boishakh, pitha season… Food arrives on the festival day. */
export default function FestivalScreen() {
  const lang = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['festival', id], queryFn: () => API.festival(id), refetchInterval: 60_000 });
  const add = useAddToCart();
  const fav = useFavorites();
  const f = q.data;
  const notYet = f ? new Date(f.opensAt) > new Date() : false;

  return (
    <Screen header={<Header back title={f ? (lang === 'bn' ? f.titleBn : f.title) : t('Festival', 'উৎসব')} />} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : q.error || !f ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <View style={{ gap: S.lg, marginTop: S.sm, marginBottom: S.lg }}>
          <View style={{ borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}>
            <LinearGradient colors={['#F5B942', '#D94F32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />
            <View pointerEvents="none" style={{ position: 'absolute', right: -70, top: -70, width: 210, height: 210, borderRadius: 105, backgroundColor: C.turmericSoft }} />
            <View style={{ padding: S.xl, gap: S.md, alignItems: 'center' }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><PartyPopper size={24} color={C.brand} /></View>
              <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.displayX, fontSize: 30, lineHeight: 38, color: C.text, textAlign: 'center' }}>{lang === 'bn' ? f.titleBn : f.title}</Text>
              {(lang === 'bn' ? f.blurbBn : f.blurb) ? <T v="body" color={C.text2} center>{lang === 'bn' ? f.blurbBn : f.blurb}</T> : null}
              <Stitch style={{ alignSelf: 'stretch' }} />
              <T v="meta">{f.open ? t('Pre-orders close in', 'প্রি-অর্ডার বন্ধ হবে') : notYet ? t('Pre-orders open in', 'প্রি-অর্ডার শুরু হবে') : t('Pre-orders are closed', 'প্রি-অর্ডার বন্ধ হয়েছে')}</T>
              {f.open || notYet ? <Countdown to={f.open ? f.closesAt : f.opensAt} light /> : null}
            </View>
          </View>

          <Row gap={S.md} style={{ backgroundColor: C.surface, borderRadius: R.lg, padding: S.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Truck size={18} color={C.brand} /></View>
            <View style={{ flex: 1 }}>
              <T v="label">{t(`Delivered on ${festDay(f.deliverOn, lang)}`, `${festDay(f.deliverOn, lang)} পৌঁছে যাবে`)}</T>
              <T v="meta">{t('Mothers cook fresh for the day. Order now, eat on the festival.', 'মায়েরা সেদিনের জন্য টাটকা রান্না করবেন। এখন অর্ডার দিন, উৎসবের দিন খান।')}</T>
            </View>
          </Row>

          {notYet ? <Note>{t('You can look at the menu now; ordering starts when the countdown ends.', 'মেনু এখনই দেখতে পারেন; কাউন্টডাউন শেষ হলে অর্ডার শুরু হবে।')}</Note> : null}

          <Row gap={6}><CalendarHeart size={16} color={C.brand} /><T v="section">{t(`Festival menu (${f.dishes.length})`, `উৎসবের মেনু (${num(f.dishes.length)})`)}</T></Row>
          {f.dishes.length ? (
            <Grid>{f.dishes.map((d) => <DishCard key={d.id} d={d} onAdd={f.open ? () => add(d) : undefined} saved={fav.dishIds.has(d.id)} onToggleSave={() => fav.toggle({ dishId: d.id })} />)}</Grid>
          ) : <Empty Icon={CalendarHeart} title={t('Mothers are adding dishes', 'মায়েরা পদ যোগ করছেন')} text={t('Check back soon, festival specials are on their way.', 'একটু পরে দেখুন, উৎসবের বিশেষ পদ আসছে।')} action={t('Request a dish', 'রিকোয়েস্ট করুন')} onAction={() => router.push('/request/new')} />}
        </View>
      )}
    </Screen>
  );
}
