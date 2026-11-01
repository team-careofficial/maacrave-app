import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GLOSS, shadow, SHEEN } from '../theme';

type TabDef = { name: string; title: string; Icon: LucideIcon };
const ND = Platform.OS !== 'web';

function TabItem({ t, focused, onPress }: { t: TabDef; focused: boolean; onPress: () => void }) {
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: false, speed: 16, bounciness: 6 }).start(); }, [focused, a]);
  const press = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: ND, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={t.title} onPress={onPress} onPressIn={() => to(0.9)} onPressOut={() => to(1)}
      style={{ flexGrow: focused ? 1.6 : 1, flexBasis: 0, alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: press }], height: 46, borderRadius: 23, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: focused ? 14 : 8, minWidth: 46 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: a }]}>
          <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%' }} />
        </Animated.View>
        <t.Icon size={21} color={focused ? '#fff' : C.muted} strokeWidth={focused ? 2.3 : 1.9} />
        {focused ? <Text numberOfLines={1} style={{ color: '#fff', fontFamily: F.bold, fontSize: 12.5 }}>{t.title}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

/** Floating white tab bar; the active tab becomes a glossy crimson pill. */
export function AppTabs({ tabs }: { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
      tabBar={({ state, navigation }) => (
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 14, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10) }}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 30, padding: 6, gap: 4, width: '100%', maxWidth: 560, alignSelf: 'center', borderWidth: 1, borderColor: C.line }, shadow as object]}>
            {state.routes.map((route, i) => {
              const t = tabs.find((x) => x.name === route.name);
              if (!t) return null;
              const focused = state.index === i;
              return (
                <TabItem key={route.key} t={t} focused={focused} onPress={() => {
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
                }} />
              );
            })}
          </View>
        </View>
      )}>
      {tabs.map(({ name, title }) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
