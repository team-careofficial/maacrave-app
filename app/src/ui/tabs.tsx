import { Tabs } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr, useLang } from '../i18n';
import { C, F } from '../theme';

type TabDef = { name: string; title: string; Icon: LucideIcon };
const ND = Platform.OS !== 'web';

function TabButton({ t, focused, onPress }: { t: TabDef; focused: boolean; onPress: () => void }) {
  const lang = useLang();
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: ND, speed: 16, bounciness: 6 }).start(); }, [focused, a]);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tr(t.title)} onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
      {/* the active tab rises into an orange coin above the bar */}
      <Animated.View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: -6, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }] }}>
        <Animated.View style={{ position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: C.brand, borderWidth: 4, borderColor: '#fff', opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
        <View style={{ position: 'relative', zIndex: 1 }}><t.Icon size={21} color={focused ? '#fff' : C.muted} strokeWidth={focused ? 2.3 : 1.9} /></View>
      </Animated.View>
      <Text numberOfLines={1} style={{ marginTop: focused ? -14 : -4, fontFamily: lang === 'bn' ? 'HindSiliguri_600SemiBold' : focused ? F.bold : F.semibold, fontSize: 10.5, color: focused ? C.brand : C.muted }}>{tr(t.title)}</Text>
    </Pressable>
  );
}

/** White floating tab bar; the active tab rises into an orange coin. */
export function AppTabs({ tabs }: { tabs: TabDef[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
      tabBar={({ state, navigation }) => {
        const current = state.routes[state.index]?.name;
        const press = (name: string) => {
          const route = state.routes.find((r) => r.name === name);
          if (!route) return;
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (current !== name && !e.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom, 10) }}>
            <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: 28, paddingHorizontal: 4, paddingBottom: 4, width: '100%', maxWidth: 560, alignSelf: 'center', borderWidth: 1, borderColor: C.line }}>
              {tabs.map((t) => <TabButton key={t.name} t={t} focused={current === t.name} onPress={() => press(t.name)} />)}
            </View>
          </View>
        );
      }}>
      {tabs.map(({ name, title }) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
