import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Beef, CakeSlice, Coffee, Cookie, Drumstick, Fish, Flame, Gift, Heart, Leaf, MessageSquarePlus, Moon, Percent, Soup, Sparkles, Sun, Users, UtensilsCrossed, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { api, API_URL } from '../api';
import { useLang } from '../i18n';
import { F, S } from '../theme';
import { Tap } from './index';
import { useCols } from './grid';
import type React from 'react';

export interface Spotlight { slot: number; title: string; titleBn: string; subtitle: string; subtitleBn: string; icon: string; theme: string; animation: string; action: string; layout?: string; hasImage?: boolean; updatedAt?: string; active: boolean }

const ND = Platform.OS !== 'web';
const ICONS: Record<string, LucideIcon> = {
  soup: Soup, fish: Fish, drumstick: Drumstick, beef: Beef, leaf: Leaf, cake: CakeSlice, cookie: Cookie, sun: Sun, moon: Moon, flame: Flame, sparkles: Sparkles,
  users: Users, gift: Gift, heart: Heart, utensils: UtensilsCrossed, request: MessageSquarePlus, percent: Percent, coffee: Coffee,
};
const THEMES: Record<string, readonly [string, string, string]> = {
  // flat colours, no shading; the default is MaaCrave orange
  crimson: ['#F26A1B', '#F26A1B', '#F26A1B'],
  saffron: ['#F59A1B', '#F59A1B', '#F59A1B'],
  forest: ['#1E8F5A', '#1E8F5A', '#1E8F5A'],
  night: ['#2B2B2B', '#2B2B2B', '#2B2B2B'],
  rose: ['#E0457B', '#E0457B', '#E0457B'],
  ocean: ['#2470C9', '#2470C9', '#2470C9'],
};

/** Shown until the team sets cards in the admin panel. */
export const DEFAULT_SPOTLIGHTS: Spotlight[] = [
  { slot: 1, layout: 'poster', title: 'Friday Biryani', titleBn: 'শুক্রবারের বিরিয়ানি', subtitle: 'Kacchi & tehari from home kitchens', subtitleBn: 'ঘরের হাঁড়ির কাচ্চি আর তেহারি', icon: 'soup', theme: 'crimson', animation: 'steam', action: 'category:rice', active: true },
  { slot: 2, title: 'Under ৳150', titleBn: '৳১৫০ এর মধ্যে', subtitle: 'Full meals on a student budget', subtitleBn: 'স্টুডেন্ট বাজেটে পেট ভরে', icon: 'percent', theme: 'saffron', animation: 'wiggle', action: 'maxPrice:150', active: true },
  { slot: 3, title: 'Light & healthy', titleBn: 'হালকা ও স্বাস্থ্যকর', subtitle: 'Less oil, more vegetables', subtitleBn: 'কম তেল, বেশি সবজি', icon: 'leaf', theme: 'forest', animation: 'float', action: 'category:healthy', active: true },
  { slot: 4, title: 'Meal plans', titleBn: 'মিল প্ল্যান', subtitle: 'Lunch box every day', subtitleBn: 'প্রতিদিন দুপুরের টিফিন', icon: 'coffee', theme: 'ocean', animation: 'pulse', action: 'plans', active: true },
  { slot: 5, title: 'Sweet tooth', titleBn: 'মিষ্টিমুখ', subtitle: 'Payesh, pitha & home desserts', subtitleBn: 'পায়েশ, পিঠা আর ঘরের মিষ্টি', icon: 'cake', theme: 'rose', animation: 'wiggle', action: 'category:dessert', active: true },
];

function go(action: string) {
  if (action === 'request') return router.push('/request/new');
  if (action === 'plans') return router.push('/plans');
  if (action === 'groups') return router.push({ pathname: '/browse', params: { tab: 'groups' } });
  if (action.startsWith('category:')) return router.push({ pathname: '/browse', params: { category: action.slice(9) } });
  if (action.startsWith('maxPrice:')) return router.push({ pathname: '/browse', params: { maxPrice: action.slice(9) } });
  return router.push('/browse');
}

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: ND })]));
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return v;
}

/** The moving icon inside a card, chosen in the admin panel (float, steam, pulse, wiggle, spin, shine). No circles — just the icon. */
function Scene({ kind, Icon, color, size }: { kind: string; Icon: LucideIcon; color: string; size: number }) {
  const a = useLoop(kind === 'spin' ? 9000 : 2400);
  const b = useLoop(2400, 800);
  const c = useLoop(2400, 1600);
  const wave = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const iconStyle =
    kind === 'wiggle' ? { transform: [{ rotate: a.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 1], outputRange: ['0deg', '-14deg', '12deg', '-8deg', '0deg', '0deg'] }) }] }
    : kind === 'spin' ? { transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
    : kind === 'pulse' || kind === 'shine' ? { transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }
    : { transform: [{ translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) }] }; // float + steam
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'steam' ? [a, b, c].map((v, i) => (
        <Animated.View key={i} style={{ position: 'absolute', top: 0, left: size / 2 - 9 + i * 7, width: 3, height: 9, borderRadius: 2, backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.45, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6, -8] }) }] }} />
      )) : null}
      <Animated.View style={iconStyle}><Icon size={size * 0.62} color={color} strokeWidth={1.9} /></Animated.View>
    </View>
  );
}

const FRAME = '#F26A1B';

/** Gentle zoom-and-drift on the picture (the "Ken Burns" effect). */
function Drift({ children }: { children: React.ReactNode }) {
  const a = useLoop(9000);
  const k = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  return <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: k.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.12] }) }, { translateX: k.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}>{children}</Animated.View>;
}

/** Pathao-style tall card: white inside, thin red border, title on top, animated drawing (or picture) below. */
function Card({ s, width, height }: { s: Spotlight; width: number; height: number }) {
  const lang = useLang();
  const bn = lang === 'bn';
  const color = (THEMES[s.theme] || THEMES.crimson)[1];
  const title = bn ? s.titleBn : s.title;
  const sub = bn ? s.subtitleBn : s.subtitle;
  const Icon = ICONS[s.icon] || UtensilsCrossed;
  const img = s.hasImage ? { uri: `${API_URL}/spotlights/${s.slot}/image?v=${encodeURIComponent(s.updatedAt || '')}` } : null;
  const small = width < 120;
  const h = height;
  const poster = s.layout === 'poster';
  const titleStyle = { fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.displayX, fontSize: small ? (bn ? 11 : 9.5) : bn ? 15 : 14.5, lineHeight: small ? (bn ? 15 : 11.5) : bn ? 21 : 16, letterSpacing: bn ? 0 : 0.2, color: FRAME, textAlign: 'center' as const, textTransform: bn ? undefined : ('uppercase' as const) };
  return (
    <Tap onPress={() => go(s.action)} scale={0.95} label={title} style={{ width, height: h, borderRadius: small ? 16 : 20, backgroundColor: '#fff',
      // no border — just a soft shadow (kept on the outer box so iOS doesn't clip it)
      ...(Platform.select({ ios: { shadowColor: '#2A0B0D', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 3 }, default: { boxShadow: '0 4px 16px -4px rgba(42,11,13,.14), 0 1px 3px rgba(42,11,13,.06)' } }) as object) }}>
      <View style={{ flex: 1, borderRadius: small ? 16 : 20, overflow: 'hidden' }}>
      {poster && img ? (
        <>
          <Drift><Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Drift>
        </>
      ) : (
        <View style={{ flex: 1, paddingTop: small ? 9 : 12, paddingHorizontal: small ? 3 : 8, alignItems: 'center' }}>
          {!poster ? (
            <>
              <Text style={titleStyle} numberOfLines={2}>{title}</Text>
              {small ? null : <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_400Regular' : F.medium, fontSize: 10.5, color: '#8B8182', marginTop: 3, textAlign: 'center' }}>{sub}</Text>}
            </>
          ) : null}
          {img ? (
            <View style={{ flex: 1, alignSelf: 'stretch', marginTop: 6, marginHorizontal: small ? -5 : -8, overflow: 'hidden' }}>
              <Drift><Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Drift>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Scene kind={s.animation} Icon={Icon} color={color} size={Math.min(width * 0.52, 72)} />
            </View>
          )}
          {poster ? (
            <View style={{ paddingBottom: small ? 9 : 14, alignItems: 'center', gap: 6 }}>
              <Text style={titleStyle} numberOfLines={2}>{title}</Text>
              {small ? null : <View style={{ backgroundColor: FRAME, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: '-3deg' }] }}>
                <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.bold, fontSize: 10, color: '#fff' }}>{sub}</Text>
              </View>}
            </View>
          ) : null}
        </View>
      )}
      </View>
    </Tap>
  );
}

/** Four Pathao-style spotlight cards in a swipeable row (all four visible on wide screens). Managed in the admin panel. */
export function SpotlightGrid() {
  const cols = useCols();
  const { width } = useWindowDimensions();
  const q = useQuery({ queryKey: ['spotlights'], queryFn: () => api<Spotlight[]>('/spotlights'), staleTime: 10 * 60_000 });
  // each slot: the admin's card if saved (shown only when switched on), otherwise the built-in one
  const saved = new Map((q.data || []).map((r) => [r.slot, r]));
  const cards = DEFAULT_SPOTLIGHTS.map((d) => saved.get(d.slot) || d).filter((c) => c.active);
  // phones: five narrow cards across, same height as before; wide screens: five roomy cards
  const cardW = cols >= 2 ? Math.min(180, (Math.min(width, 1080) - 32 - 4 * 12) / 5) : Math.min(72, (Math.min(width, 520) - 32 - 4 * 8) / 5);
  const cardH = cols >= 2 ? cardW * 1.25 : 88;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: cols >= 2 ? 12 : 8, paddingHorizontal: S.lg, paddingVertical: 12 }}>
      {cards.map((s) => <Card key={s.slot} s={s} width={cardW} height={cardH} />)}
    </ScrollView>
  );
}
