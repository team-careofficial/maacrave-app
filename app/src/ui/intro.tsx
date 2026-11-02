import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { F } from '../theme';

/** Rich crimson-to-maroon for the launch screen. */
const INTRO = ['#A3141A', '#7A0D12', '#4C080C'] as const;
const GLOW = ['rgba(255,196,176,0.30)', 'rgba(255,196,176,0)'] as const;
/** Soft specks of light that drift upward behind the logo. */
const SPECKS = [{ x: -130, y: 160, s: 5, d: 0 }, { x: 110, y: 190, s: 4, d: 500 }, { x: -60, y: 230, s: 3, d: 900 }, { x: 150, y: 90, s: 3, d: 300 }, { x: -160, y: 40, s: 4, d: 1200 }, { x: 70, y: 260, s: 5, d: 700 }];
/** Never keep people on the intro longer than this, even if the server is slow to wake up. */
const MAX_MS = 4500;
import { Logo } from './brand';

const ND = Platform.OS !== 'web';
const WORD = 'MaaCrave'.split('');

/**
 * Launch animation shown once per app start, continuing from the crimson native splash:
 * the logo pops in with a ripple, the wordmark rises letter by letter, the tagline fades in,
 * then everything lifts away to reveal the app.
 */
export function Intro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logo = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const letters = useRef(WORD.map(() => new Animated.Value(0))).current;
  const tag = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const played = useRef(false);
  const finished = useRef(false);
  // Kept in a ref so the animation callback always sees the latest value (a stale closure here froze the intro).
  const readyRef = useRef(ready);
  readyRef.current = ready;

  function leave(force = false) {
    if (finished.current || (!force && (!played.current || !readyRef.current))) return;
    finished.current = true;
    Animated.timing(out, { toValue: 1, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: ND }).start(() => onDone());
  }

  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }), Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: ND })])).start();
    Animated.loop(Animated.timing(drift, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: ND })).start();
    Animated.timing(bar, { toValue: 1, duration: 2600, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logo, { toValue: 1, useNativeDriver: ND, speed: 9, bounciness: 12 }),
        Animated.timing(ripple, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      ]),
      Animated.stagger(45, letters.map((v) => Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.6)), useNativeDriver: ND }))),
      Animated.timing(tag, { toValue: 1, duration: 320, useNativeDriver: ND }),
      Animated.delay(380),
    ]).start(() => { played.current = true; leave(); });
    const safety = setTimeout(() => leave(true), MAX_MS);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { leave(); }, [ready]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <LinearGradient colors={INTRO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={GLOW} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 0.8 }} style={{ position: 'absolute', left: 0, right: 0, top: '20%', height: '45%' }} />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(20,2,4,0.35)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%' }}>
        {SPECKS.map((p, i) => (
          <Animated.View key={i} style={{ position: 'absolute', left: p.x, top: p.y - 120, width: p.s, height: p.s, borderRadius: p.s, backgroundColor: '#FFE3DA',
            opacity: drift.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.7, 0.5, 0] }),
            transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [i * 6, -120 - i * 10] }) }] }} />
        ))}
      </View>
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }, { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }}>
        <View pointerEvents="none" style={{ position: 'absolute', width: 520, height: 520, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
          {[520, 400, 290].map((d) => <View key={d} style={{ position: 'absolute', width: d, height: d, borderRadius: d / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />)}
        </View>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,214,200,0.16)',
            opacity: Animated.multiply(logo, glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) }] }} />
          <Animated.View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#fff',
            opacity: ripple.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }] }} />
          <Animated.View style={{ opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { rotate: logo.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) }] }}>
            <Logo size={92} inverse />
          </Animated.View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 26 }}>
          {WORD.map((ch, i) => (
            <Animated.Text key={i} style={{ fontFamily: F.displayX, fontSize: 44, letterSpacing: -1.2, color: i >= 3 ? '#FFD9D9' : '#fff',
              opacity: letters[i], transform: [{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }}>{ch}</Animated.Text>
          ))}
        </View>
        <Animated.View style={{ opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }], alignItems: 'center', marginTop: 10, gap: 4 }}>
          <Text style={{ fontFamily: F.bnBold, fontSize: 17, color: 'rgba(255,255,255,0.95)' }}>ঘরের খাবার, মায়ের হাতের</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4 }}>Homemade food from verified mothers</Text>
        </Animated.View>
        <View style={{ marginTop: 34, width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <Animated.View style={{ width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
