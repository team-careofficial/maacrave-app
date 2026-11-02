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

/** Soft tint of a theme colour for the white cards. */
const TINT: Record<string, { soft: string; mid: string }> = {
  crimson: { soft: '#FDEEEE', mid: '#F7D3D4' }, saffron: { soft: '#FFF4E5', mid: '#FDE0B8' }, forest: { soft: '#EAF6EF', mid: '#CBEBD8' },
  night: { soft: '#F0EDF6', mid: '#DCD5EA' }, rose: { soft: '#FDEEF3', mid: '#F8D2DF' }, ocean: { soft: '#EBF3FC', mid: '#CFE1F6' },
};

/** The moving drawing inside a card, chosen in the admin panel (float, steam, pulse, wiggle, spin, shine). */
function Scene({ kind, Icon, color, tint, size }: { kind: string; Icon: LucideIcon; color: string; tint: { soft: string; mid: string }; size: number }) {
  const a = useLoop(kind === 'spin' ? 9000 : kind === 'shine' ? 2800 : 2400);
  const b = useLoop(2400, 800);
  const c = useLoop(2400, 1600);
  const slow = useLoop(6000);
  const wave = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const breathe = slow.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  const iconStyle =
    kind === 'float' ? { transform: [{ translateY: wave.interpolate({ inputRange: [0, 1], outputRange: [4, -6] }) }] }
    : kind === 'wiggle' ? { transform: [{ rotate: a.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 1], outputRange: ['0deg', '-14deg', '12deg', '-8deg', '0deg', '0deg'] }) }] }
    : kind === 'spin' ? { transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
    : kind === 'pulse' ? { transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }
    : {};
  const disc = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* slow breathing halo */}
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: tint.soft,
        transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.02] }) }] }} />
      {/* little orbiting dots */}
      <Animated.View style={{ position: 'absolute', width: size * 0.9, height: size * 0.9, transform: [{ rotate: slow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <View style={{ position: 'absolute', top: 0, left: size * 0.45 - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 0.55 }} />
        <View style={{ position: 'absolute', bottom: size * 0.12, right: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: color, opacity: 0.35 }} />
      </Animated.View>
      {kind === 'pulse' ? [a, b].map((v, i) => (
        <Animated.View key={i} style={{ position: 'absolute', width: disc, height: disc, borderRadius: disc / 2, borderWidth: 2, borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }} />
      )) : null}
      {kind === 'steam' ? [a, b, c].map((v, i) => (
        <Animated.View key={i} style={{ position: 'absolute', top: size / 2 - disc / 2 - 6, left: size / 2 - 12 + i * 9, width: 5, height: 14, borderRadius: 3, backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, -16] }) }, { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }} />
      )) : null}
      <View style={{ width: disc, height: disc, borderRadius: disc / 2, backgroundColor: '#fff', borderWidth: 1.5, borderColor: tint.mid, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {kind === 'shine' ? <Shine color={tint.mid} /> : null}
        <Animated.View style={iconStyle}><Icon size={disc * 0.46} color={color} strokeWidth={2} /></Animated.View>
      </View>
    </View>
  );
}

function Shine({ color = 'rgba(255,255,255,0.9)' }: { color?: string }) {
  const a = useLoop(3200, 400);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -40, bottom: -40, width: 30, opacity: 0.8,
      transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-80, 120] }) }, { rotate: '20deg' }] }}>
      <LinearGradient colors={['rgba(255,255,255,0)', color, 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const FRAME = '#C7272D';

/** Gentle zoom-and-drift on the picture (the "Ken Burns" effect). */
function Drift({ children }: { children: React.ReactNode }) {
  const a = useLoop(9000);
  const k = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  return <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: k.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.12] }) }, { translateX: k.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}>{children}</Animated.View>;
}

/** Pathao-style tall card: white inside, thin red border, title on top, animated drawing (or picture) below. */
function Card({ s, width }: { s: Spotlight; width: number }) {
  const lang = useLang();
  const bn = lang === 'bn';
  const color = (THEMES[s.theme] || THEMES.crimson)[1];
  const tint = TINT[s.theme] || TINT.crimson;
  const title = bn ? s.titleBn : s.title;
  const sub = bn ? s.subtitleBn : s.subtitle;
  const Icon = ICONS[s.icon] || UtensilsCrossed;
  const img = s.hasImage ? { uri: `${API_URL}/spotlights/${s.slot}/image?v=${encodeURIComponent(s.updatedAt || '')}` } : null;
  const h = width * 1.42;
  const poster = s.layout === 'poster';
  const titleStyle = { fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.displayX, fontSize: bn ? 15 : 14.5, lineHeight: bn ? 21 : 16, letterSpacing: bn ? 0 : 0.2, color: FRAME, textAlign: 'center' as const, textTransform: bn ? undefined : ('uppercase' as const) };
  return (
    <Tap onPress={() => go(s.action)} scale={0.95} label={title} style={{ width, height: h, borderRadius: 20, borderWidth: 2, borderColor: FRAME, backgroundColor: '#fff', overflow: 'hidden',
      ...(Platform.select({ ios: { shadowColor: '#7C0E13', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }, android: { elevation: 2 }, default: { boxShadow: '0 10px 22px -16px rgba(124,14,19,.45)' } }) as object) }}>
      {poster && img ? (
        <>
          <Drift><Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Drift>
        </>
      ) : (
        <View style={{ flex: 1, paddingTop: 12, paddingHorizontal: 8, alignItems: 'center' }}>
          {!poster ? (
            <>
              <Text style={titleStyle} numberOfLines={2}>{title}</Text>
              <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_400Regular' : F.medium, fontSize: 10.5, color: '#8B8182', marginTop: 3, textAlign: 'center' }}>{sub}</Text>
            </>
          ) : null}
          {img ? (
            <View style={{ flex: 1, alignSelf: 'stretch', marginTop: 8, marginHorizontal: -8, overflow: 'hidden' }}>
              <Drift><Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" /></Drift>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Scene kind={s.animation} Icon={Icon} color={color} tint={tint} size={Math.min(width * 0.78, poster ? 120 : 100)} />
            </View>
          )}
          {poster ? (
            <View style={{ paddingBottom: 14, alignItems: 'center', gap: 6 }}>
              <Text style={titleStyle} numberOfLines={2}>{title}</Text>
              <View style={{ backgroundColor: FRAME, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: '-3deg' }] }}>
                <Text numberOfLines={1} style={{ fontFamily: bn ? 'HindSiliguri_600SemiBold' : F.bold, fontSize: 10, color: '#fff' }}>{sub}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}
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
  const cardW = cols >= 2 ? Math.min(200, (Math.min(width, 1080) - 32 - 36) / 4) : Math.min(132, (width - 32 - 30) / 3.3);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: 10, paddingHorizontal: S.lg, paddingVertical: 6 }}>
      {cards.map((s) => <Card key={s.slot} s={s} width={cardW} />)}
    </ScrollView>
  );
}
