import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { C, F, GLOSS, ON_GLOSS } from '../theme';
import { Logo } from './logo';

/** Burgundy launch screen (matches the native splash colour #7A0D12). */
const INTRO = GLOSS;
/** Never keep people on the intro longer than this, even if the server is slow to wake up. */
const MAX_MS = 4500;
const ND = Platform.OS !== 'web';
const LOGO = 92;

/**
 * Pathao-style launch: the logo fades in from soft to solid, settles with a gentle bounce,
 * a light sweep crosses it, the MaaCrave name slides out beneath it, then the screen fades into the app.
 */
export function Intro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logo = useRef(new Animated.Value(0)).current; // 0 → 1: faint & small → solid
  const lift = useRef(new Animated.Value(0)).current; // logo moves up to make room for the name
  const sweep = useRef(new Animated.Value(0)).current; // light sweep across the logo
  const name = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(0)).current;
  const played = useRef(false);
  const finished = useRef(false);
  // Kept in a ref so the animation callback always sees the latest value (a stale closure here once froze the intro).
  const readyRef = useRef(ready);
  readyRef.current = ready;

  function leave(force = false) {
    if (finished.current || (!force && (!played.current || !readyRef.current))) return;
    finished.current = true;
    Animated.timing(out, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(() => onDone());
  }

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.4)), useNativeDriver: ND }),
      Animated.parallel([
        Animated.timing(sweep, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(lift, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        Animated.sequence([Animated.delay(140), Animated.timing(name, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: ND })]),
      ]),
      Animated.timing(tag, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: ND }),
      Animated.delay(450),
    ]).start(() => { played.current = true; leave(); });
    const safety = setTimeout(() => leave(true), MAX_MS);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { leave(); }, [ready]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <LinearGradient colors={INTRO} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* soft light from the top, like a lamp over the kitchen */}
      <LinearGradient colors={['rgba(255,205,190,0.18)', 'rgba(255,205,190,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%' }} />

      <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}>
        <Animated.View style={{ alignItems: 'center', transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }}>
          {/* logo: faint → solid, small → full, with a soft shadow */}
          <Animated.View style={[{
            opacity: logo.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.45, 1] }),
            transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) }],
          }, Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } }, android: { elevation: 12 }, default: { boxShadow: '0 18px 40px -12px rgba(0,0,0,.45)' } }) as object, { borderRadius: LOGO * 0.3 }]}>
            <View style={{ width: LOGO, height: LOGO, borderRadius: LOGO * 0.3, overflow: 'hidden' }}>
              <Logo size={LOGO} inverse />
              <Animated.View style={{ position: 'absolute', top: -20, bottom: -20, width: 34, opacity: 0.75,
                transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, LOGO + 30] }) }, { rotate: '18deg' }] }}>
                <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,240,200,0.9)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            </View>
          </Animated.View>

          {/* name slides up beneath the logo */}
          <View style={{ overflow: 'hidden', marginTop: 18, paddingHorizontal: 4 }}>
            <Animated.View style={{ flexDirection: 'row', opacity: name, transform: [{ translateY: name.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 40, lineHeight: 48, letterSpacing: -1.2, color: '#FFFFFF' }}>Maa</Text>
              <Text style={{ fontFamily: F.displayX, fontSize: 40, lineHeight: 48, letterSpacing: -1.2, color: '#FFC9C9' }}>Crave</Text>
            </Animated.View>
          </View>

          <Animated.View style={{ alignItems: 'center', marginTop: 8, opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
            <View style={{ width: 28, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 10 }} />
            <Text style={{ fontFamily: F.bnBold, fontSize: 17, lineHeight: 26, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.2 }}>ঘরের খাবার, মায়ের হাতের</Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>

    </Animated.View>
  );
}
