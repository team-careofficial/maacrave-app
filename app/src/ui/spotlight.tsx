import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Beef, CakeSlice, Coffee, Cookie, Drumstick, Fish, Flame, Gift, Heart, Leaf, MessageSquarePlus, Moon, Percent, Soup, Sparkles, Sun, Users, UtensilsCrossed, type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { api, API_URL } from '../api';
import { useLang } from '../i18n';
import { F, R, S } from '../theme';
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
  crimson: ['#D8292F', '#B0161C', '#7C0E13'],
  saffron: ['#F4A12E', '#E07B12', '#B85A07'],
  forest: ['#3BA06A', '#1E7F4F', '#145C38'],
  night: ['#3A2A4F', '#261B36', '#16101F'],
  rose: ['#E8698A', '#C93F66', '#9C2649'],
  ocean: ['#3C8DD8', '#2463B3', '#163F7A'],
};

/** Shown until the team sets cards in the admin panel. */
export const DEFAULT_SPOTLIGHTS: Spotlight[] = [
  { slot: 1, layout: 'poster', title: 'Friday Biryani', titleBn: 'শুক্রবারের বিরিয়ানি', subtitle: 'Kacchi & tehari from home kitchens', subtitleBn: 'ঘরের হাঁড়ির কাচ্চি আর তেহারি', icon: 'soup', theme: 'crimson', animation: 'steam', action: 'category:rice', active: true },
  { slot: 2, title: 'Under ৳150', titleBn: '৳১৫০ এর মধ্যে', subtitle: 'Full meals on a student budget', subtitleBn: 'স্টুডেন্ট বাজেটে পেট ভরে', icon: 'percent', theme: 'saffron', animation: 'wiggle', action: 'maxPrice:150', active: true },
  { slot: 3, title: 'Light & healthy', titleBn: 'হালকা ও স্বাস্থ্যকর', subtitle: 'Less oil, more vegetables', subtitleBn: 'কম তেল, বেশি সবজি', icon: 'leaf', theme: 'forest', animation: 'float', action: 'category:healthy', active: true },
  { slot: 4, title: 'Meal plans', titleBn: 'মিল প্ল্যান', subtitle: 'Lunch box every day', subtitleBn: 'প্রতিদিন দুপুরের টিফিন', icon: 'coffee', theme: 'ocean', animation: 'pulse', action: 'plans', active: true },
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

/** The moving bits inside a card, chosen in the admin panel. */
function AnimatedIcon({ kind, Icon, big }: { kind: string; Icon: LucideIcon; big?: boolean }) {
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
  const z = big ? 1.5 : 1;
  return (
    <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', transform: [{ scale: z }] }}>
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

const FRAME = '#C7272D';

/** Gentle zoom-and-drift on the picture (the "Ken Burns" effect). */
function Drift({ children }: { children: React.ReactNode }) {
  const a = useLoop(9000);
  const k = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  return <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: k.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.12] }) }, { translateX: k.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>{children}</Animated.View>;
}

/** Pathao-style tall card: crimson frame, title on a curved colour band, picture (or animated icon) below. */
function Card({ s, width }: { s: Spotlight; width: number }) {
  const lang = useLang();
  const bn = lang === 'bn';
  const colors = THEMES[s.theme] || THEMES.crimson;
  const title = bn ? s.titleBn : s.title;
  const sub = bn ? s.subtitleBn : s.subtitle;
  const Icon = ICONS[s.icon] || UtensilsCrossed;
  const img = s.hasImage ? { uri: `${API_URL}/spotlights/${s.slot}/image?v=${encodeURIComponent(s.updatedAt || '')}` } : null;
  const titleStyle = { fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.displayX, fontSize: bn ? 21 : 21, lineHeight: bn ? 28 : 22, letterSpacing: bn ? 0 : -0.3, color: '#fff', textAlign: 'center' as const, textTransform: bn ? undefined : ('uppercase' as const) };
  const scene = img ? (
    <Drift><Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Drift>
  ) : (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors[2], colors[1]]} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {s.animation === 'shine' ? <Shine /> : null}
      {[0, 1, 2].map((i) => <View key={i} style={{ position: 'absolute', bottom: -20 + i * 6, left: -10 + i * 52, width: 70, height: 60 + i * 18, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: 'rgba(0,0,0,0.12)' }} />)}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' }}><AnimatedIcon kind={s.animation} Icon={Icon} big /></View>
    </View>
  );
  return (
    <Tap onPress={() => go(s.action)} scale={0.96} label={title} style={{ width, borderRadius: 26, borderWidth: 3, borderColor: FRAME, padding: 3, backgroundColor: '#fff',
      ...(Platform.select({ ios: { shadowColor: '#7C0E13', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 4 }, default: { boxShadow: '0 12px 24px -14px rgba(124,14,19,.45)' } }) as object) }}>
      <View style={{ height: width * 1.36, borderRadius: 20, overflow: 'hidden', backgroundColor: colors[1] }}>
        {s.layout === 'poster' ? (
          <>
            {img ? scene : (
              <>
                <LinearGradient colors={[colors[0], colors[2], '#1A0A0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Shine />
              </>
            )}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 10 }}>
              {!img ? <AnimatedIcon kind={s.animation} Icon={Icon} /> : null}
              <Text style={titleStyle} numberOfLines={3}>{title}</Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '-4deg' }] }}>
                <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.bold, fontSize: 12, color: FRAME }}>{sub}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '38%' }}>{scene}</View>
            {/* curved colour band with the title */}
            <View style={{ position: 'absolute', top: -width * 0.55, left: -width * 0.35, width: width * 1.7, height: width * 1.08, borderRadius: width, overflow: 'hidden' }}>
              <LinearGradient colors={[colors[0], colors[1]]} style={StyleSheet.absoluteFill} />
            </View>
            <View style={{ paddingTop: 16, paddingHorizontal: 10, alignItems: 'center' }}>
              <Text style={titleStyle} numberOfLines={2}>{title}</Text>
              <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_400Regular' : F.semibold, fontSize: 11, color: 'rgba(255,255,255,0.88)', marginTop: 3 }}>{sub}</Text>
            </View>
          </>
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
  const fromServer = q.data || [];
  const cards = (q.data && fromServer.length ? fromServer : DEFAULT_SPOTLIGHTS).slice(0, 4);
  const cardW = cols >= 2 ? Math.min(230, (Math.min(width, 1080) - 32 - 36) / 4) : Math.min(168, width * 0.42);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: 12, paddingHorizontal: S.lg, paddingVertical: 4 }}>
      {cards.map((s) => <Card key={s.slot} s={s} width={cardW} />)}
    </ScrollView>
  );
}
