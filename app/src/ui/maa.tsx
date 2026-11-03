import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AlertTriangle, ArrowRight, CalendarHeart, HeartPulse, Quote, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tk } from '../format';
import { num, t, useLang } from '../i18n';
import { ALLERGY, bnOf, festDay, HEALTH, mediaUrl, REGIONS, untilParts } from '../maa';
import { C, F, GLOSS, MAROON, ON_GLOSS, R, S, shadow } from '../theme';
import type { CookPublic, Dish, Festival, HomeData } from '../types';
import { Avatar, CategoryTile, Row, T, Tap } from './index';

/* ---------- small pieces ---------- */

/** Nakshi-kantha style running stitch with a little diamond in the middle: the MaaCrave divider. */
export function Stitch({ color = C.turmeric, style }: { color?: string; style?: object }) {
  return (
    <Row gap={6} style={[{ justifyContent: 'center', opacity: 0.9 }, style]}>
      <View style={{ flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: color }} />
      <View style={{ width: 7, height: 7, transform: [{ rotate: '45deg' }], backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color, opacity: 0.6 }} />
      <View style={{ width: 7, height: 7, transform: [{ rotate: '45deg' }], backgroundColor: color }} />
      <View style={{ flex: 1, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: color }} />
    </Row>
  );
}

/** The cook's own photo of the dish, or the category illustration until she adds one. */
export function FoodPhoto({ d, size = 58, radius, style }: { d: Pick<Dish, 'photoId' | 'category'>; size?: number | `${number}%`; radius?: number; style?: object }) {
  const uri = mediaUrl(d.photoId);
  const n = typeof size === 'number' ? size : 120;
  if (!uri) return <CategoryTile category={d.category} size={n} solid />;
  return <Image source={{ uri }} style={[{ width: size, height: typeof size === 'number' ? size : undefined, aspectRatio: typeof size === 'number' ? undefined : 4 / 3, borderRadius: radius ?? n * 0.28, backgroundColor: C.sunken }, style]} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

/** A mother's portrait in a turmeric ring; her initials until she adds a photo. */
export function MotherPhoto({ c, size = 56, ring = true }: { c: Pick<CookPublic, 'displayName' | 'portraitId'>; size?: number; ring?: boolean }) {
  const uri = mediaUrl(c.portraitId);
  const inner = uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.sunken }} /> : <Avatar name={c.displayName} size={size} />;
  if (!ring) return inner;
  return (
    <View style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>{inner}</View>
    </View>
  );
}

export function HealthPills({ tags, max = 3 }: { tags?: string[]; max?: number }) {
  const lang = useLang();
  if (!tags?.length) return null;
  return (
    <Row gap={6} wrap>
      {tags.slice(0, max).map((k) => HEALTH[k] ? (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.pill, backgroundColor: HEALTH[k].color + '14' }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: HEALTH[k].color }} />
          <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold, fontSize: 11.5, color: HEALTH[k].color }}>{lang === 'bn' ? HEALTH[k].bn : HEALTH[k].en}</Text>
        </View>
      ) : null)}
    </Row>
  );
}

export function RegionPill({ region }: { region?: string | null }) {
  const lang = useLang();
  const r = region ? REGIONS[region] : null;
  if (!r) return null;
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.pill, backgroundColor: C.turmericSoft }}>
      <Text style={{ fontSize: 10 }}>📍</Text>
      <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold, fontSize: 11.5, color: C.onTurmeric }}>{lang === 'bn' ? `${bnOf(r.bn)} স্বাদ` : `${r.en} style`}</Text>
    </View>
  );
}

/** "Contains milk — you said you avoid it." Shown on dish cards and the dish page. */
export function AllergyNote({ hits, compact }: { hits: string[]; compact?: boolean }) {
  const lang = useLang();
  if (!hits.length) return null;
  const names = hits.map((h) => (lang === 'bn' ? ALLERGY[h] || h : h.toLowerCase())).join(', ');
  return (
    <Row gap={6} style={{ backgroundColor: C.errSoft, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: compact ? 5 : 9 }}>
      <AlertTriangle size={compact ? 13 : 16} color={C.err} />
      <T v="meta" color={C.err} style={{ flex: 1 }}>{t(`Contains ${names}: you said you avoid ${hits.length > 1 ? 'these' : 'this'}`, `এতে ${names} আছে, আপনি এটা এড়িয়ে চলেন`)}</T>
    </Row>
  );
}

/* ---------- Home sections ---------- */

/** "এই সপ্তাহের মা": one mother, her words, her best dishes. Chosen by the MaaCrave team each week. */
export function MotherOfWeek({ c }: { c: NonNullable<HomeData['featured']> }) {
  const lang = useLang();
  const since = c.createdAt ? new Date(c.createdAt) : null;
  const months = since ? Math.max(1, Math.round((Date.now() - since.getTime()) / (30 * 86400_000))) : null;
  return (
    <Tap onPress={() => router.push(`/cook/${c.id}`)} scale={0.985} style={{ borderRadius: R.xl, overflow: 'hidden', ...(shadow as object) }}>
      <LinearGradient colors={MAROON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* soft turmeric sun behind the portrait */}
      <View style={{ position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(233,161,0,0.16)' }} />
      <View style={{ position: 'relative', padding: S.lg, gap: S.md }}>
        <Row gap={6}><Star size={13} color={C.turmeric} fill={C.turmeric} /><T v="eyebrow" color={C.turmeric} bn={lang === 'bn'}>{t('Mother of the week', 'এই সপ্তাহের মা')}</T></Row>
        <Row gap={S.md} style={{ alignItems: 'center' }}>
          <MotherPhoto c={c} size={68} />
          <View style={{ flex: 1, gap: 3 }}>
            <T v="section" color="#fff" numberOfLines={1}>{c.displayName}</T>
            <T v="meta" color="rgba(255,255,255,0.78)" numberOfLines={1}>{c.area}{c.region && REGIONS[c.region] ? ` · ${lang === 'bn' ? bnOf(REGIONS[c.region].bn) + ' মেয়ে' : 'from ' + REGIONS[c.region].en}` : ''}</T>
            <Row gap={10} style={{ marginTop: 2 }}>
              {c.ratingCount ? <Row gap={3}><Star size={12} color={C.turmeric} fill={C.turmeric} /><T v="meta" color="#fff">{num(c.rating.toFixed(1))}</T></Row> : null}
              {c.completedOrders ? <T v="meta" color="#fff">{t(`${c.completedOrders} meals`, `${num(c.completedOrders)} বার রান্না`)}</T> : null}
              {months ? <T v="meta" color="rgba(255,255,255,0.78)">{t(`${months} mo with us`, `${num(months)} মাস আমাদের সাথে`)}</T> : null}
            </Row>
          </View>
        </Row>
        {c.story ? (
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: R.lg, padding: S.md }}>
            <Quote size={16} color={C.turmeric} />
            <T v="sub" color="#fff" numberOfLines={3} style={{ flex: 1, fontStyle: 'italic' }}>{c.story}</T>
          </View>
        ) : null}
        {c.dishes.length ? (
          <Row gap={S.sm}>
            {c.dishes.map((d) => (
              <View key={d.id} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.md, padding: 6, gap: 4 }}>
                {d.photoId ? <Image source={{ uri: mediaUrl(d.photoId)! }} style={{ width: '100%', aspectRatio: 1.3, borderRadius: R.sm }} /> : <View style={{ width: '100%', aspectRatio: 1.3, borderRadius: R.sm, backgroundColor: 'rgba(233,161,0,0.18)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>🍛</Text></View>}
                <T v="meta" color="#fff" numberOfLines={1}>{lang === 'bn' && d.nameBn ? d.nameBn : d.name}</T>
                <T v="meta" color={C.turmeric} style={{ fontFamily: F.bold }}>{tk(d.price)}</T>
              </View>
            ))}
          </Row>
        ) : null}
        <Row gap={6} style={{ alignSelf: 'flex-start', backgroundColor: C.turmeric, borderRadius: R.pill, paddingHorizontal: 14, height: 34 }}>
          <T v="label" color={ON_GLOSS}>{t('Visit her kitchen', 'ওনার রান্নাঘর দেখুন')}</T><ArrowRight size={15} color={ON_GLOSS} />
        </Row>
      </View>
    </Tap>
  );
}

/** "নিজের জেলার স্বাদ": a card per district that has cooks right now. */
export function RegionRow({ regions }: { regions: HomeData['regions'] }) {
  const lang = useLang();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
      {regions.map(({ key, dishes }) => {
        const r = REGIONS[key];
        if (!r) return null;
        return (
          <Tap key={key} onPress={() => router.push({ pathname: '/browse', params: { region: key } })} scale={0.96}
            style={{ width: 148, borderRadius: R.lg, padding: S.md, gap: 6, backgroundColor: C.surface, borderTopWidth: 4, borderTopColor: r.tint, ...(shadow as object) }}>
            <Text style={{ fontFamily: F.bnBold, fontSize: 19, color: r.tint }}>{r.bn}</Text>
            {lang !== 'bn' ? <T v="meta" color={C.text2}>{r.en}</T> : null}
            <T v="meta" numberOfLines={2} style={{ minHeight: 32 }}>{lang === 'bn' ? r.knownBn : r.known}</T>
            <T v="meta" color={C.brandText} style={{ fontFamily: F.bold }}>{t(`${dishes} dish${dishes > 1 ? 'es' : ''} →`, `${num(dishes)}টি পদ →`)}</T>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

function useTick(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => { const i = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(i); }, [ms]);
}

export function Countdown({ to, light }: { to: string; light?: boolean }) {
  useTick();
  const lang = useLang();
  const p = untilParts(to);
  if (!p) return null;
  const box = (v: number, en: string, bn: string) => (
    <View style={{ minWidth: 48, alignItems: 'center', paddingVertical: 6, borderRadius: R.sm, backgroundColor: light ? 'rgba(255,255,255,0.65)' : C.surface }}>
      <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.displayX, fontSize: 20, lineHeight: 26, color: C.brand }}>{num(v)}</Text>
      <T v="meta" color={C.text2}>{t(en, bn)}</T>
    </View>
  );
  return <Row gap={6}>{box(p.d, 'days', 'দিন')}{box(p.h, 'hrs', 'ঘণ্টা')}{box(p.m, 'min', 'মিনিট')}</Row>;
}


/** Festival pre-order banner: turmeric, nakshi stitch, live countdown. */
export function FestivalBanner({ f }: { f: Festival }) {
  const lang = useLang();
  const open = new Date(f.opensAt) <= new Date();
  return (
    <Tap onPress={() => router.push(`/festival/${f.id}`)} scale={0.985} style={{ borderRadius: R.xl, overflow: 'hidden', ...(shadow as object) }}>
      <LinearGradient colors={['#FFF3CF', '#F8D776', '#F0B92A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'relative', padding: S.lg, gap: S.md, borderWidth: 1.5, borderColor: 'rgba(122,31,36,0.25)', borderStyle: 'dashed', margin: 6, borderRadius: R.xl - 4 }}>
        <Row gap={6}><CalendarHeart size={15} color={C.brand} /><T v="eyebrow" color={C.brand} bn={lang === 'bn'}>{open ? t('Festival pre-orders open', 'উৎসবের প্রি-অর্ডার চলছে') : t('Coming soon', 'শীঘ্রই আসছে')}</T></Row>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.displayX, fontSize: 26, lineHeight: 32, color: C.brandDark }}>{lang === 'bn' ? f.titleBn : f.title}</Text>
          {(lang === 'bn' ? f.blurbBn : f.blurb) ? <T v="sub" color={C.onTurmeric}>{lang === 'bn' ? f.blurbBn : f.blurb}</T> : null}
        </View>
        <Stitch color={C.brand} />
        <View style={{ gap: 6 }}>
          <T v="meta" color={C.onTurmeric}>{open ? t('Orders close in', 'অর্ডার বন্ধ হবে') : t('Opens in', 'শুরু হবে')}</T>
          <Countdown to={open ? f.closesAt : f.opensAt} light />
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="meta" color={C.onTurmeric} style={{ flex: 1 }}>{t(`Arrives ${festDay(f.deliverOn, lang)}`, `পৌঁছাবে ${festDay(f.deliverOn, lang)}`)}{f.dishCount ? ` · ${t(`${f.dishCount} dishes`, `${num(f.dishCount)}টি পদ`)}` : ''}</T>
          <Row gap={6} style={{ backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: 14, height: 34 }}>
            <T v="label" color="#fff">{open ? t('Pre-order', 'প্রি-অর্ডার') : t('See menu', 'মেনু দেখুন')}</T><ArrowRight size={15} color="#fff" />
          </Row>
        </Row>
      </View>
    </Tap>
  );
}

/** "স্বাস্থ্য ও যত্ন": shortcuts to dishes for diabetes, kids, patients… */
export function CareRow({ mine }: { mine?: string[] }) {
  const lang = useLang();
  const keys = Object.keys(HEALTH).sort((a, b) => Number(!!mine?.includes(b)) - Number(!!mine?.includes(a)));
  return (
    <View style={{ gap: S.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
        {keys.map((k) => (
          <Tap key={k} onPress={() => router.push({ pathname: '/browse', params: { tag: k } })} scale={0.95}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: mine?.includes(k) ? HEALTH[k].color : HEALTH[k].color + '12' }}>
            <HeartPulse size={15} color={mine?.includes(k) ? '#fff' : HEALTH[k].color} />
            <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold, fontSize: 13.5, color: mine?.includes(k) ? '#fff' : HEALTH[k].color }}>{lang === 'bn' ? HEALTH[k].bn : HEALTH[k].en}</Text>
          </Tap>
        ))}
      </ScrollView>
      <Tap onPress={() => router.push('/diet')} style={{ alignSelf: 'flex-start' }}>
        <T v="meta" color={C.brandText} style={{ fontFamily: F.bold }}>{mine?.length ? t('Edit my food preferences →', 'আমার খাদ্যাভ্যাস বদলান →') : t('Set my food preferences & allergies →', 'আমার খাদ্যাভ্যাস ও অ্যালার্জি দিন →')}</T>
      </Tap>
    </View>
  );
}
