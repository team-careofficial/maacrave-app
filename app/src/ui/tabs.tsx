import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr, useLang } from '../i18n';
import { C, F, GLOSS, SHEEN } from '../theme';

type TabDef = { name: string; title: string; Icon: LucideIcon };
const ND = Platform.OS !== 'web';
const shadow = (o: number, r: number, y: number) => Platform.select({ ios: { shadowColor: '#2A0B0D', shadowOpacity: o, shadowRadius: r, shadowOffset: { width: 0, height: y } }, android: { elevation: Math.round(r / 2) }, default: { boxShadow: `0 ${y}px ${r * 2}px -${r / 2}px rgba(42,11,13,${o + 0.1})` } as object }) as object;

function useSpring(on: boolean) {
  const a = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.spring(a, { toValue: on ? 1 : 0, useNativeDriver: ND, speed: 14, bounciness: 8 }).start(); }, [on, a]);
  return a;
}

function SideTab({ t, focused, onPress }: { t: TabDef; focused: boolean; onPress: () => void }) {
  const lang = useLang();
  const a = useSpring(focused);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tr(t.title)} onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 62 }}>
      <Animated.View style={{ alignItems: 'center', gap: 4, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
        <t.Icon size={22} color={focused ? C.brand : C.muted} strokeWidth={focused ? 2.4 : 1.9} />
        <Text numberOfLines={1} style={{ fontFamily: lang === 'bn' ? 'HindSiliguri_600SemiBold' : F.semibold, fontSize: 10.5, color: focused ? C.brand : C.muted }}>{tr(t.title)}</Text>
        <Animated.View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.brand, opacity: a, transform: [{ scale: a }] }} />
      </Animated.View>
    </Pressable>
  );
}

/** The raised round button in the middle (Home / Today / Pickups). */
function CenterTab({ t, focused, onPress }: { t: TabDef; focused: boolean; onPress: () => void }) {
  const lang = useLang();
  const press = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: ND, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tr(t.title)} onPress={onPress} onPressIn={() => to(0.9)} onPressOut={() => to(1)}
      style={{ width: 78, alignItems: 'center' }}>
      <Animated.View style={[{ marginTop: -30, width: 66, height: 66, borderRadius: 33, borderWidth: 5, borderColor: C.surface, transform: [{ scale: press }] }, shadow(0.3, 14, 10)]}>
        <View style={{ flex: 1, borderRadius: 30, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%' }} />
          <t.Icon size={26} color="#fff" strokeWidth={2.4} />
        </View>
      </Animated.View>
      <Text numberOfLines={1} style={{ marginTop: 3, fontFamily: lang === 'bn' ? 'HindSiliguri_600SemiBold' : F.bold, fontSize: 10.5, color: focused ? C.brand : C.text2 }}>{tr(t.title)}</Text>
    </Pressable>
  );
}

/** White floating tab bar with a raised round button in the middle. `center` names the middle tab. */
export function AppTabs({ tabs, center = 'index' }: { tabs: TabDef[]; center?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
      tabBar={({ state, navigation }) => {
        const press = (name: string) => {
          const route = state.routes.find((r) => r.name === name);
          if (!route) return;
          const focused = state.routes[state.index]?.name === name;
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const current = state.routes[state.index]?.name;
        const ci = tabs.findIndex((t) => t.name === center);
        const left = tabs.slice(0, ci), right = tabs.slice(ci + 1), mid = tabs[ci];
        return (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 10) }}>
            <View style={[{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.surface, borderRadius: 28, paddingHorizontal: 6, width: '100%', maxWidth: 560, alignSelf: 'center', borderWidth: 1, borderColor: C.line }, shadow(0.12, 18, 8)]}>
              <View style={{ flex: 1, flexDirection: 'row' }}>{left.map((t) => <SideTab key={t.name} t={t} focused={current === t.name} onPress={() => press(t.name)} />)}</View>
              {mid ? <CenterTab t={mid} focused={current === mid.name} onPress={() => press(mid.name)} /> : null}
              <View style={{ flex: 1, flexDirection: 'row' }}>{right.map((t) => <SideTab key={t.name} t={t} focused={current === t.name} onPress={() => press(t.name)} />)}</View>
            </View>
          </View>
        );
      }}>
      {tabs.map(({ name, title }) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
