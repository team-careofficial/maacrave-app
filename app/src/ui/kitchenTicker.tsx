import { router } from 'expo-router';
import { ArrowRight, ChefHat, Star } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { num, t, useLang } from '../i18n';
import { C, F, ON_GLOSS, ON_GLOSS_SOFT, R, S } from '../theme';
import type { CookPublic } from '../types';
import { Glossy, T, Tap } from './index';

const ND = Platform.OS !== 'web';
const SHOW_MS = 3200;

/**
 * The maroon banner on Home: mothers' kitchens slide in one after another
 * ("Cooking today · Shahana's Kitchen · Mohammadpur ★4.8"). Tap a name to open that kitchen.
 * With no kitchens yet, it shows the line of the day instead.
 */
export function KitchenTicker({ cooks, fallback }: { cooks: CookPublic[]; fallback: { bn: string; en: string } }) {
  const lang = useLang();
  // Kitchens taking orders first, then the rest; at most 12 so the loop stays short.
  const list = [...cooks].sort((a, b) => Number(b.accepting) - Number(a.accepting) || b.rating - a.rating).slice(0, 12);
  const [i, setI] = useState(0);
  const a = useRef(new Animated.Value(1)).current; // 0 = sliding in from below, 1 = in place, 2 = leaving upward

  useEffect(() => {
    if (list.length < 2) return;
    const timer = setInterval(() => {
      Animated.timing(a, { toValue: 2, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(() => {
        setI((x) => (x + 1) % list.length);
        a.setValue(0);
        Animated.timing(a, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
      });
    }, SHOW_MS);
    return () => clearInterval(timer);
  }, [list.length, a]);

  const c = list.length ? list[i % list.length] : null;
  const move = {
    opacity: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1, 2], outputRange: [22, 0, -22] }) }],
  };

  return (
    <Glossy style={{ marginTop: S.lg }} radius={22} glow={false} onPress={c ? () => router.push(`/cook/${c.id}`) : undefined}>
      <View style={{ paddingVertical: S.lg, paddingHorizontal: S.xl, flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 88 }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -50, top: -60, width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -30, width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
        {c ? (
          <>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={22} color={ON_GLOSS} />
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <T v="meta" color={ON_GLOSS_SOFT}>{c.accepting ? t('Cooking today', 'আজ রান্না করছেন') : t('Mothers on MaaCrave', 'MaaCrave-এর মায়েরা')}</T>
              <Animated.View style={move}>
                <T v="card" color={ON_GLOSS} numberOfLines={1} style={{ fontFamily: lang === 'bn' ? F.bnBold : F.bold, fontSize: 18, lineHeight: 26 }}>{c.displayName}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T v="meta" color={ON_GLOSS_SOFT} numberOfLines={1}>{c.area}</T>
                  {c.ratingCount ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Star size={11} color={C.turmeric} fill={C.turmeric} />
                      <T v="meta" color={ON_GLOSS_SOFT}>{num(c.rating.toFixed(1))}</T>
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            </View>
            {/* small dots showing which kitchen is on screen */}
            {list.length > 1 ? (
              <View style={{ position: 'absolute', left: S.xl, bottom: 8, flexDirection: 'row', gap: 4 }}>
                {list.map((x, k) => <View key={x.id} style={{ width: k === i % list.length ? 12 : 4, height: 4, borderRadius: 2, backgroundColor: k === i % list.length ? '#fff' : 'rgba(255,255,255,0.35)' }} />)}
              </View>
            ) : null}
          </>
        ) : (
          <View style={{ flex: 1, gap: 4 }}>
            <T v="card" bn color={ON_GLOSS} style={{ fontFamily: F.bnBold, fontSize: 18, lineHeight: 26 }}>{fallback.bn}</T>
            <T v="meta" color={ON_GLOSS_SOFT}>{fallback.en}</T>
          </View>
        )}
        <Tap onPress={() => router.push(c ? `/cook/${c.id}` : '/browse')} scale={0.92} style={{ backgroundColor: '#fff', borderRadius: R.pill, height: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="label" color={C.brandText}>{c ? t('View', 'দেখুন') : 'Explore'}</T><ArrowRight size={15} color={C.brandText} />
        </Tap>
      </View>
    </Glossy>
  );
}
