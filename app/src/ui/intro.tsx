import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { F } from '../theme';

/** Deep maroon for the launch screen (darker than the brand crimson). */
const INTRO = ['#5C0B10', '#3F070B', '#260406'] as const;
const GLOW = ['rgba(226,55,60,0.35)', 'rgba(226,55,60,0)'] as const;
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
      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: out.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }, { scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
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
      </Animated.View>
    </Animated.View>
  );
}
