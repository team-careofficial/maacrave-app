import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Beef, CakeSlice, Coffee, Cookie, Drumstick, Fish, Flame, Gift, Heart, Leaf, MessageSquarePlus, Moon, Percent, Soup, Sparkles, Sun, Users, UtensilsCrossed, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { useLang } from '../i18n';
import { F, R, S } from '../theme';
import { Tap } from './index';
import { useCols } from './grid';

export interface Spotlight { slot: number; title: string; titleBn: string; subtitle: string; subtitleBn: string; icon: string; theme: string; animation: string; action: string; active: boolean }

const ND = Platform.OS !== 'web';
const ICONS: Record<string, LucideIcon> = {
  soup: Soup, fish: Fish, drumstick: Drumstick, beef: Beef, leaf: Leaf, cake: CakeSlice, cookie: Cookie, sun: Sun, moon: Moon, flame: Flame, sparkles: Sparkles,
  users: Users, gift: Gift, heart: Heart, utensils: UtensilsCrossed, request: MessageSquarePlus, percent: Percent, coffee: Coffee,
};
const THEMES: Record<string, readonly [string, string, string]> = {
  crimson: ['#D8292F', '#B0161C', '#7C0E13'],
  saffron: ['#F4A12E', '#E07B12', '#B85A07'],
  forest: ['#3BA06A', '#1E7F4F', '#145C38'],
  night: ['#3A2A4F', '#261B36', '#16101F'],
  rose: ['#E8698A', '#C93F66', '#9C2649'],
  ocean: ['#3C8DD8', '#2463B3', '#163F7A'],
};

/** Shown until the team sets cards in the admin panel. */
export const DEFAULT_SPOTLIGHTS: Spotlight[] = [
  { slot: 1, title: 'Friday Biryani', titleBn: 'শুক্রবারের বিরিয়ানি', subtitle: 'Kacchi & tehari from home kitchens', subtitleBn: 'ঘরের হাঁড়ির কাচ্চি আর তেহারি', icon: 'soup', theme: 'crimson', animation: 'steam', action: 'category:rice', active: true },
  { slot: 2, title: 'Under ৳150', titleBn: '৳১৫০ এর মধ্যে', subtitle: 'Full meals on a student budget', subtitleBn: 'স্টুডেন্ট বাজেটে পেট ভরে', icon: 'percent', theme: 'saffron', animation: 'wiggle', action: 'maxPrice:150', active: true },
  { slot: 3, title: 'Light & healthy', titleBn: 'হালকা ও স্বাস্থ্যকর', subtitle: 'Less oil, more vegetables', subtitleBn: 'কম তেল, বেশি সবজি', icon: 'leaf', theme: 'forest', animation: 'float', action: 'category:healthy', active: true },
  { slot: 4, title: 'Group dinner', titleBn: 'গ্রুপ ডিনার', subtitle: 'Join neighbours, pay less', subtitleBn: 'প্রতিবেশীদের সাথে, কম খরচে', icon: 'users', theme: 'night', animation: 'pulse', action: 'groups', active: true },
];

function go(action: string) {
  if (action === 'request') return router.push('/request/new');
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

/** The moving bits inside a card, chosen in the admin panel. */
function AnimatedIcon({ kind, Icon }: { kind: string; Icon: LucideIcon }) {
  const a = useLoop(kind === 'spin' ? 9000 : kind === 'shine' ? 2600 : 2200);
  const b = useLoop(2200, 700);
  const c = useLoop(2200, 1400);
  const wave = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const iconStyle =
    kind === 'float' ? { transform: [{ translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [3, -5] }) }] }
    : kind === 'wiggle' ? { transform: [{ rotate: a.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 1], outputRange: ['0deg', '-14deg', '12deg', '-8deg', '0deg', '0deg'] }) }] }
    : kind === 'spin' ? { transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
    : kind === 'pulse' ? { transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }
    : {};
  return (
    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'pulse' ? [a, b].map((v, i) => (
        <Animated.View key={i} style={{ position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }} />
      )) : null}
      {kind === 'steam' ? [a, b, c].map((v, i) => (
        <Animated.View key={i} style={{ position: 'absolute', top: -6, left: 14 + i * 9, width: 5, height: 14, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.75)',
          opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, -16] }) }, { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }} />
      )) : null}
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={iconStyle}><Icon size={25} color="#fff" strokeWidth={2} /></Animated.View>
      </View>
    </View>
  );
}

function Shine() {
  const a = useLoop(3200, 400);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -40, bottom: -40, width: 60, opacity: 0.35,
      transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-120, 360] }) }, { rotate: '20deg' }] }}>
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function Card({ s }: { s: Spotlight }) {
  const lang = useLang();
  const bn = lang === 'bn';
  const colors = THEMES[s.theme] || THEMES.crimson;
  return (
    <Tap onPress={() => go(s.action)} scale={0.97} label={s.title} style={{ flex: 1, borderRadius: R.lg, minHeight: 148 }}>
      <View style={{ flexGrow: 1, minHeight: 148, borderRadius: R.lg, overflow: 'hidden', padding: S.md, justifyContent: 'space-between' }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%' }} />
        <View style={{ position: 'absolute', right: -30, bottom: -30, width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)' }} />
        {s.animation === 'shine' ? <Shine /> : null}
        <AnimatedIcon kind={s.animation} Icon={ICONS[s.icon] || UtensilsCrossed} />
        <View style={{ marginTop: S.md }}>
          <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.displayX, fontSize: bn ? 17 : 17.5, letterSpacing: bn ? 0 : -0.4, color: '#fff' }}>{bn ? s.titleBn : s.title}</Text>
          <Text numberOfLines={2} style={{ fontFamily: bn ? 'HindSiliguri_400Regular' : F.medium, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{bn ? s.subtitleBn : s.subtitle}</Text>
        </View>
      </View>
    </Tap>
  );
}

/** Four animated spotlight cards (2×2 on phones, 4 in a row on wide screens). Content comes from the admin panel. */
export function SpotlightGrid() {
  const cols = useCols();
  const q = useQuery({ queryKey: ['spotlights'], queryFn: () => api<Spotlight[]>('/spotlights'), staleTime: 10 * 60_000 });
  const fromServer = q.data || [];
  const cards = [1, 2, 3, 4].map((slot) => fromServer.find((x) => x.slot === slot) || (q.data && fromServer.length ? null : DEFAULT_SPOTLIGHTS[slot - 1])).filter(Boolean) as Spotlight[];
  const perRow = cols >= 2 ? 4 : 2;
  const rows: Spotlight[][] = [];
  for (let i = 0; i < cards.length; i += perRow) rows.push(cards.slice(i, i + perRow));
  return (
    <View style={{ gap: S.md }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: S.md }}>
          {row.map((s) => <Card key={s.slot} s={s} />)}
          {row.length < perRow ? Array.from({ length: perRow - row.length }, (_, k) => <View key={`e${k}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}
