import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AlertTriangle, ArrowRight, CalendarDays, ChevronRight, HeartPulse, MapPin, Quote, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tk } from '../format';
import { num, t, useLang } from '../i18n';
import { ALLERGY, bnOf, festDay, HEALTH, mediaUrl, REGIONS, untilParts } from '../maa';
import { C, F, MANGO, R, S, shadow } from '../theme';
import type { CookPublic, Dish, Festival, HomeData } from '../types';
import { Avatar, CategoryTile, Row, T, Tap } from './index';

/* ---------- small pieces ---------- */

/** A quiet hairline divider with a small paprika point in the middle. */
export function Stitch({ color = C.line2, style }: { color?: string; style?: object }) {
  return (
    <Row gap={10} style={[{ justifyContent: 'center' }, style]}>
      <View style={{ flex: 1, height: 1, backgroundColor: color }} />
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.brand, opacity: 0.7 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: color }} />
    </Row>
  );
}

/** The cook's own photo of the dish, or the category illustration until she adds one. */
export function FoodPhoto({ d, size = 58, radius, style }: { d: Pick<Dish, 'photoId' | 'category'>; size?: number; radius?: number; style?: object }) {
  const uri = mediaUrl(d.photoId);
  if (!uri) return <CategoryTile category={d.category} size={size} solid />;
  return <Image source={{ uri }} style={[{ width: size, height: size, borderRadius: radius ?? size * 0.28, backgroundColor: C.sunken }, style]} resizeMode="cover" />;
}

/** A mother's portrait in a fine mango ring; her initials until she adds a photo. */
export function MotherPhoto({ c, size = 56, ring = true }: { c: Pick<CookPublic, 'displayName' | 'portraitId'>; size?: number; ring?: boolean }) {
  const uri = mediaUrl(c.portraitId);
  const inner = uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.sunken }} /> : <Avatar name={c.displayName} size={size} />;
  if (!ring) return inner;
  return (
    <View style={{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <LinearGradient colors={MANGO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ width: size + 3, height: size + 3, borderRadius: (size + 3) / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>{inner}</View>
    </View>
  );
}

export function HealthPills({ tags, max = 3 }: { tags?: string[]; max?: number }) {
  const lang = useLang();
  if (!tags?.length) return null;
  return (
    <Row gap={6} wrap>
      {tags.slice(0, max).map((k) => HEALTH[k] ? (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 24, borderRadius: R.pill, backgroundColor: HEALTH[k].color + '12' }}>
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
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 24, borderRadius: R.pill, backgroundColor: C.brandSoft }}>
      <MapPin size={11} color={C.brandText} />
      <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold, fontSize: 11.5, color: C.brandText }}>{lang === 'bn' ? `${bnOf(r.bn)} রান্না` : `${r.en} recipe`}</Text>
    </View>
  );
}

/** "Contains milk — you said you avoid it." Shown on the dish page. */
export function AllergyNote({ hits, compact }: { hits: string[]; compact?: boolean }) {
  const lang = useLang();
  if (!hits.length) return null;
  const names = hits.map((h) => (lang === 'bn' ? ALLERGY[h] || h : h.toLowerCase())).join(', ');
  return (
    <Row gap={8} style={{ backgroundColor: C.errSoft, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: compact ? 6 : 10 }}>
      <AlertTriangle size={compact ? 13 : 16} color={C.err} />
      <T v="meta" color={C.err} style={{ flex: 1 }}>{t(`Contains ${names}: you said you avoid ${hits.length > 1 ? 'these' : 'this'}`, `এতে ${names} আছে, আপনি এটা এড়িয়ে চলেন`)}</T>
    </Row>
  );
}

function Eyebrow({ children, color = C.brandText }: { children: string; color?: string }) {
  const lang = useLang();
  return <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.bold, fontSize: lang === 'bn' ? 12.5 : 11, letterSpacing: lang === 'bn' ? 0 : 1.1, textTransform: 'uppercase', color }}>{children}</Text>;
}

/* ---------- Home sections ---------- */

/** "এই সপ্তাহের মা": one mother, her words, her best dishes. Chosen by the MaaCrave team each week. */
export function MotherOfWeek({ c }: { c: NonNullable<HomeData['featured']> }) {
  const lang = useLang();
  const months = c.createdAt ? Math.max(1, Math.round((Date.now() - new Date(c.createdAt).getTime()) / (30 * 86400_000))) : null;
  return (
    <Tap onPress={() => router.push(`/cook/${c.id}`)} scale={0.99} style={{ borderRadius: R.xl, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...(shadow as object) }}>
      {/* fine mango-to-paprika line along the top */}
      <LinearGradient colors={['#E9A23B', '#A9151B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />
      <View style={{ padding: S.lg, gap: S.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}><Star size={13} color={C.turmeric} fill={C.turmeric} /><Eyebrow>{t('Mother of the week', 'এই সপ্তাহের মা')}</Eyebrow></Row>
          <ChevronRight size={18} color={C.muted} />
        </Row>
        <Row gap={S.md} style={{ alignItems: 'center' }}>
          <MotherPhoto c={c} size={64} />
          <View style={{ flex: 1, gap: 3 }}>
            <T v="section" numberOfLines={1}>{c.displayName}</T>
            <T v="meta" numberOfLines={1}>{c.area}{c.region && REGIONS[c.region] ? ` · ${lang === 'bn' ? bnOf(REGIONS[c.region].bn) + ' রান্না' : REGIONS[c.region].en + ' cooking'}` : ''}</T>
          </View>
        </Row>
        <Row gap={S.sm}>
          {[
            { k: c.ratingCount ? num(c.rating.toFixed(1)) + '★' : t('New', 'নতুন'), l: t('rating', 'রেটিং') },
            { k: num(c.completedOrders), l: t('meals cooked', 'বার রান্না') },
            { k: months ? num(months) : '—', l: t('months with us', 'মাস সাথে') },
          ].map((x) => (
            <View key={x.l} style={{ flex: 1, paddingVertical: 10, borderRadius: R.md, backgroundColor: C.surface2, alignItems: 'center', gap: 1 }}>
              <T v="price" style={{ fontSize: 17 }}>{x.k}</T>
              <T v="meta" numberOfLines={1}>{x.l}</T>
            </View>
          ))}
        </Row>
        {c.story ? (
          <View style={{ flexDirection: 'row', gap: 10, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: C.brand }}>
            <Quote size={15} color={C.brand} />
            <T v="sub" color={C.text2} numberOfLines={3} style={{ flex: 1, fontStyle: 'italic' }}>{c.story}</T>
          </View>
        ) : null}
        {c.dishes.length ? (
          <Row gap={S.sm}>
            {c.dishes.map((d) => (
              <View key={d.id} style={{ flex: 1, gap: 5 }}>
                {d.photoId ? <Image source={{ uri: mediaUrl(d.photoId)! }} style={{ width: '100%', aspectRatio: 1.15, borderRadius: R.md, backgroundColor: C.sunken }} />
                  : <View style={{ width: '100%', aspectRatio: 1.15, borderRadius: R.md, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}><CategoryTile category="lunch" size={34} solid /></View>}
                <T v="meta" color={C.text} numberOfLines={1} style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold }}>{lang === 'bn' && d.nameBn ? d.nameBn : d.name}</T>
                <T v="meta" color={C.brandText} style={{ fontFamily: F.bold, marginTop: -3 }}>{tk(d.price)}</T>
              </View>
            ))}
          </Row>
        ) : null}
      </View>
    </Tap>
  );
}

/** "আঞ্চলিক খাবার": each district and the dishes it's famous for, cooked by mothers from there. */
export function RegionRow({ regions }: { regions: HomeData['regions'] }) {
  const lang = useLang();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg, marginVertical: -10 }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg, paddingVertical: 10 }}>
      {regions.map(({ key, dishes }) => {
        const r = REGIONS[key];
        if (!r) return null;
        return (
          <Tap key={key} onPress={() => router.push({ pathname: '/browse', params: { region: key } })} scale={0.97}
            style={{ width: 168, borderRadius: R.lg, padding: S.md, gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, ...(shadow as object) }}>
            <Row gap={8}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}><MapPin size={15} color={C.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bnBold, fontSize: 16, lineHeight: 22, color: C.text }} numberOfLines={1}>{r.bn}</Text>
                {lang !== 'bn' ? <T v="meta" numberOfLines={1} style={{ marginTop: -2 }}>{r.en}</T> : null}
              </View>
            </Row>
            <View style={{ gap: 1, minHeight: 38 }}>
              <T v="meta">{t('Famous for', 'বিখ্যাত')}</T>
              <T v="label" numberOfLines={2}>{lang === 'bn' ? r.knownBn : r.known}</T>
            </View>
            <Row gap={4}><T v="meta" color={C.brandText} style={{ fontFamily: F.bold }}>{t(`${dishes} dish${dishes > 1 ? 'es' : ''}`, `${num(dishes)}টি পদ`)}</T><ArrowRight size={12} color={C.brandText} /></Row>
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

export function Countdown({ to }: { to: string; light?: boolean }) {
  useTick();
  const lang = useLang();
  const p = untilParts(to);
  if (!p) return null;
  const box = (v: number, en: string, bn: string) => (
    <View style={{ minWidth: 54, alignItems: 'center', paddingVertical: 7, borderRadius: R.md, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line }}>
      <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.displayX, fontSize: 20, lineHeight: 26, color: C.text }}>{num(String(v).padStart(2, '0'))}</Text>
      <T v="meta">{t(en, bn)}</T>
    </View>
  );
  return <Row gap={6}>{box(p.d, 'days', 'দিন')}{box(p.h, 'hrs', 'ঘণ্টা')}{box(p.m, 'min', 'মিনিট')}</Row>;
}

/** Festival pre-order card: clean white, a soft mango corner, live countdown. */
export function FestivalBanner({ f }: { f: Festival }) {
  const lang = useLang();
  const open = new Date(f.opensAt) <= new Date();
  return (
    <Tap onPress={() => router.push(`/festival/${f.id}`)} scale={0.99} style={{ borderRadius: R.xl, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...(shadow as object) }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: C.turmericSoft }} />
      <View style={{ position: 'relative', padding: S.lg, gap: S.md }}>
        <Row gap={6} style={{ alignSelf: 'flex-start', backgroundColor: C.brandSoft, borderRadius: R.pill, paddingHorizontal: 10, height: 26 }}>
          <CalendarDays size={13} color={C.brandText} /><Eyebrow>{open ? t('Festival pre-order', 'উৎসবের প্রি-অর্ডার') : t('Coming soon', 'শীঘ্রই আসছে')}</Eyebrow>
        </Row>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.displayX, fontSize: 26, lineHeight: 34, letterSpacing: lang === 'bn' ? 0 : -0.6, color: C.text }}>{lang === 'bn' ? f.titleBn : f.title}</Text>
          {(lang === 'bn' ? f.blurbBn : f.blurb) ? <T v="sub" color={C.text2}>{lang === 'bn' ? f.blurbBn : f.blurb}</T> : null}
        </View>
        <View style={{ gap: 6 }}>
          <T v="meta">{open ? t('Orders close in', 'অর্ডার বন্ধ হবে') : t('Opens in', 'শুরু হবে')}</T>
          <Countdown to={open ? f.closesAt : f.opensAt} />
        </View>
        <View style={{ height: 1, backgroundColor: C.line }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T v="meta">{t('Delivered on', 'ডেলিভারি')}</T>
            <T v="label">{festDay(f.deliverOn, lang)}{f.dishCount ? ` · ${t(`${f.dishCount} dishes`, `${num(f.dishCount)}টি পদ`)}` : ''}</T>
          </View>
          <Row gap={6} style={{ backgroundColor: C.brand, borderRadius: R.pill, paddingHorizontal: 16, height: 38 }}>
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
        {keys.map((k) => {
          const on = !!mine?.includes(k);
          return (
            <Tap key={k} onPress={() => router.push({ pathname: '/browse', params: { tag: k } })} scale={0.95}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: on ? C.text : C.surface, borderWidth: 1, borderColor: on ? C.text : C.line2 }}>
              <HeartPulse size={15} color={on ? '#fff' : HEALTH[k].color} />
              <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold, fontSize: 13.5, color: on ? '#fff' : C.text }}>{lang === 'bn' ? HEALTH[k].bn : HEALTH[k].en}</Text>
            </Tap>
          );
        })}
      </ScrollView>
      <Tap onPress={() => router.push('/diet')} style={{ alignSelf: 'flex-start' }}>
        <Row gap={4}><T v="meta" color={C.brandText} style={{ fontFamily: F.bold }}>{mine?.length ? t('Edit my food preferences', 'আমার খাদ্যাভ্যাস বদলান') : t('Set my food preferences & allergies', 'আমার খাদ্যাভ্যাস ও অ্যালার্জি দিন')}</T><ChevronRight size={14} color={C.brandText} /></Row>
      </Tap>
    </View>
  );
}
