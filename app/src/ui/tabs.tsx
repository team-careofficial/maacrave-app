import { Tabs } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tr, useLang } from '../i18n';
import { C, F } from '../theme';

type TabDef = { name: string; title: string; Icon: LucideIcon };
const ND = Platform.OS !== 'web';
const barShadow = Platform.select({
  ios: { shadowColor: '#2A0B0D', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 10 },
  default: { boxShadow: '0 14px 34px -14px rgba(42,11,13,.28)' } as object,
}) as object;

function TabButton({ t, focused, onPress }: { t: TabDef; focused: boolean; onPress: () => void }) {
  const lang = useLang();
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: ND, speed: 16, bounciness: 6 }).start(); }, [focused, a]);
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tr(t.title)} onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <View style={{ width: 52, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 52, height: 32, borderRadius: 16, backgroundColor: C.brandSoft, opacity: a, transform: [{ scaleX: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }} />
        <t.Icon size={21} color={focused ? C.brand : C.muted} strokeWidth={focused ? 2.4 : 1.9} />
      </View>
      <Text numberOfLines={1} style={{ marginTop: 3, fontFamily: lang === 'bn' ? 'HindSiliguri_600SemiBold' : focused ? F.bold : F.semibold, fontSize: 10.5, color: focused ? C.brand : C.muted }}>{tr(t.title)}</Text>
    </Pressable>
  );
}

/** White floating tab bar; the active tab gets a soft crimson pill. */
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
            <View style={[{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: 26, paddingHorizontal: 4, width: '100%', maxWidth: 560, alignSelf: 'center', borderWidth: 1, borderColor: C.line }, barShadow]}>
              {tabs.map((t) => <TabButton key={t.name} t={t} focused={current === t.name} onPress={() => press(t.name)} />)}
            </View>
          </View>
        );
      }}>
      {tabs.map(({ name, title }) => <Tabs.Screen key={name} name={name} options={{ title }} />)}
    </Tabs>
  );
}
