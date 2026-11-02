import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr, useLang } from '../i18n';
import { F, GLOSS, SHEEN } from '../theme';

type TabDef = { name: string; title: string; Icon: LucideIcon };
const ND = Platform.OS !== 'web';
const BAR = '#1E1415';

function TabItem({ t, focused, onPress }: { t: TabDef; focused: boolean; onPress: () => void }) {
  const lang = useLang();
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: ND, speed: 14, bounciness: 7 }).start(); }, [focused, a]);
  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: ND, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tr(t.title)} onPress={onPress} onPressIn={() => to(0.88)} onPressOut={() => to(1)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 58 }}>
      <Animated.View style={{ alignItems: 'center', gap: 3, transform: [{ scale: press }] }}>
        <View style={{ width: 46, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          {/* glossy crimson pill behind the active icon */}
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden', opacity: a, transform: [{ scaleX: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
            <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%' }} />
          </Animated.View>
          <t.Icon size={20} color={focused ? '#fff' : 'rgba(255,255,255,0.55)'} strokeWidth={focused ? 2.4 : 1.9} />
        </View>
        <Text numberOfLines={1} style={{ fontFamily: lang === 'bn' ? 'HindSiliguri_600SemiBold' : F.semibold, fontSize: 10.5, color: focused ? '#fff' : 'rgba(255,255,255,0.55)' }}>{tr(t.title)}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Floating dark tab bar; the active tab glows with a glossy crimson pill. */
export function AppTabs({ tabs }: { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#FFFFFF' } }}
      tabBar={({ state, navigation }) => (
        <View style={{ backgroundColor: 'transparent', paddingHorizontal: 14, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 12), position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
          <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: BAR, borderRadius: 30, paddingHorizontal: 6, width: '100%', maxWidth: 520, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
            Platform.select({ ios: { shadowColor: '#2A0B0D', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } }, android: { elevation: 14 }, default: { boxShadow: '0 18px 40px -14px rgba(42,11,13,.55)' } as object }) as object]}>
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
