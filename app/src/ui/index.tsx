import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AlertTriangle, BadgeCheck, Beef, CakeSlice, Check, ChevronLeft, ChevronRight, Clock, Cookie, Drumstick, Fish, Heart, Leaf, Minus, Moon, Plus, Soup, Star, Sun, Users, Utensils,
  type LucideIcon,
} from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Easing, Image, Platform, Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, Switch, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { countdown, statusTone, STATUS_LABEL, tk } from '../format';
import { tr, useLang } from '../i18n';
import { Logo } from './logo';
import { C, CATEGORY_META, F, GLOSS, MAROON, MATTE, ON_GLOSS, R, S, SHEEN, TYPE, TypeKey, redShadow, shadow } from '../theme';
import type { Batch, CookPublic, Dish, Order, OrderStatus } from '../types';
import { onAppError } from '../errors';
import { useAuth } from '../auth';
import { allergyHits, bnOf, HEALTH, mediaUrl, regionOf, REGIONS } from '../maa';

const ND = Platform.OS !== 'web';
const APressable = Animated.createAnimatedComponent(Pressable);

/* ---------- text ---------- */
const BN_FONT = (family?: string) => (family === F.regular || family === F.medium ? F.bn : F.bnBold);
/** Every piece of text in the app. Plain-string children are translated in Bangla mode and use the Bangla font. */
export function T({ v = 'body', color, style, children, bn, numberOfLines, center }: { v?: TypeKey; color?: string; style?: StyleProp<TextStyle>; children: React.ReactNode; bn?: boolean; numberOfLines?: number; center?: boolean }) {
  const lang = useLang();
  const base = TYPE[v] as TextStyle;
  const defaultColor = v === 'sub' || v === 'meta' || v === 'eyebrow' ? C.muted : C.text;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const bangla = bn || lang === 'bn';
  const body = Array.isArray(children) ? children.map((c) => (typeof c === 'string' ? tr(c) : c)) : tr(children);
  return (
    <Text numberOfLines={numberOfLines} style={[base, { color: color || defaultColor }, center && { textAlign: 'center' }, style,
      bangla && { fontFamily: BN_FONT(flat?.fontFamily || base.fontFamily), letterSpacing: 0, lineHeight: undefined }]}>
      {body}
    </Text>
  );
}
/** Raw <Text> helper for places that render text outside <T> (buttons, chips, badges). */
function useTxt() {
  const lang = useLang();
  return (s: string | undefined, family: string) => ({ text: tr(s), font: lang === 'bn' ? BN_FONT(family) : family });
}

/* ---------- motion ---------- */
/** Pressable that gently sinks when touched. Layout styles stay on the pressable itself. */
export function Tap({ children, onPress, style, disabled, scale = 0.97, label, role = 'button', hitSlop }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; scale?: number; label?: string; role?: 'button' | 'radio' | 'switch' | 'link'; hitSlop?: number;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: ND, speed: 40, bounciness: 5 }).start();
  return (
    <APressable onPress={onPress} disabled={disabled} onPressIn={() => to(scale)} onPressOut={() => to(1)} accessibilityRole={role} accessibilityLabel={label} hitSlop={hitSlop}
      style={[style, { transform: [{ scale: s }] }]}>
      {children}
    </APressable>
  );
}
/** Fades and lifts content in when it first appears. */
export function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(); }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>{children}</Animated.View>;
}
export function Skeleton({ h = 16, w = '100%', r = 8, style }: { h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: ND }),
      Animated.timing(a, { toValue: 0.45, duration: 700, useNativeDriver: ND }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ height: h, width: w, borderRadius: r, backgroundColor: C.sunken, opacity: a }, style]} />;
}

/* ---------- surfaces ---------- */
/** Glossy turmeric surface: gradient and a soft top sheen. Put dark text (ON_GLOSS) on it. */
export function Glossy({ children, style, colors = GLOSS, radius = R.xl, glow = true, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; colors?: readonly [string, string, ...string[]]; radius?: number; glow?: boolean; onPress?: () => void }) {
  const body = (
    <View style={{ borderRadius: radius, overflow: 'hidden', flexGrow: 1 }}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={SHEEN} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%' }} pointerEvents="none" />
      {children}
    </View>
  );
  const outer = [{ borderRadius: radius }, glow && (redShadow as object), style];
  return onPress ? <Tap onPress={onPress} scale={0.98} style={outer}>{body}</Tap> : <View style={outer}>{body}</View>;
}
/** Matte deep-maroon surface. */
export const Matte = (p: Omit<React.ComponentProps<typeof Glossy>, 'colors' | 'glow'>) => <Glossy {...p} colors={MATTE} glow={false} />;
/** Decorative concentric rings for hero cards. */
export function Rings({ size = 180, right = -40, top = -40, color = '#FFFFFF' }: { size?: number; right?: number; top?: number; color?: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right, top, width: size, height: size }}>
      {[1, 0.72, 0.46].map((k, i) => (
        <View key={i} style={{ position: 'absolute', width: size * k, height: size * k, left: (size - size * k) / 2, top: (size - size * k) / 2, borderRadius: size, borderWidth: 1.5, borderColor: color, opacity: 0.1 + i * 0.05 }} />
      ))}
    </View>
  );
}

/* ---------- icons ---------- */
const CAT_ICONS: Record<string, LucideIcon> = { soup: Soup, utensils: Utensils, fish: Fish, drumstick: Drumstick, beef: Beef, leaf: Leaf, cookie: Cookie, sun: Sun, moon: Moon, cake: CakeSlice };
export function CategoryTile({ category, size = 44, solid }: { category: string; size?: number; solid?: boolean }) {
  const m = CATEGORY_META[category] || CATEGORY_META.lunch;
  const Icon = CAT_ICONS[m.icon] || Utensils;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: solid ? C.surface : undefined }}>
      {solid ? null : <LinearGradient colors={[m.color + '1F', m.color + '1F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <View style={{ position: 'relative', zIndex: 1 }}><Icon size={size * 0.46} color={m.color} strokeWidth={1.9} /></View>
    </View>
  );
}
export function IconTile({ Icon, color = C.brandText, size = 40 }: { Icon: LucideIcon; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color + '16', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.48} color={color} strokeWidth={1.9} />
    </View>
  );
}

/* ---------- layout ---------- */
export const MAX_W = 1080;
export function Screen({ children, header, footer, scroll = true, onRefresh, refreshing, padded = true }: { children: React.ReactNode; header?: React.ReactNode; footer?: React.ReactNode; scroll?: boolean; onRefresh?: () => void; refreshing?: boolean; padded?: boolean }) {
  const inner = <View style={[styles.inner, padded && { paddingHorizontal: S.lg }, !scroll && { flex: 1 }]}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: footer ? 130 : 128 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.brand} colors={[C.brand]} /> : undefined}>
          {inner}
        </ScrollView>
      ) : inner}
      {footer ? <Footer>{footer}</Footer> : null}
    </SafeAreaView>
  );
}
export function Footer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, S.md) }]}>
      <View style={[styles.inner, { flexDirection: 'row', gap: S.md, alignItems: 'center', paddingHorizontal: S.lg }]}>{children}</View>
    </View>
  );
}
/** Logo + MaaCrave wordmark, shown at the top-left of every screen. */
export function Wordmark({ size = 34, onDark }: { size?: number; onDark?: boolean }) {
  const fs = Math.round(size * 0.6);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.26 }}>
      <Logo size={size} />
      <Text style={{ fontFamily: F.displayX, fontSize: fs, letterSpacing: -0.6, color: onDark ? '#fff' : C.text }}>
        Maa<Text style={{ color: onDark ? '#FFFFFF' : C.brand }}>Crave</Text>
      </Text>
    </View>
  );
}

/**
 * Screen header. Main screens: logo + wordmark on top, then a large title.
 * Inner screens (back): back button and title, with the logo + wordmark kept at the top-right.
 */
export function Header({ title, sub, back, right }: { title: string; sub?: string; back?: boolean; right?: React.ReactNode }) {
  if (back) {
    return (
      <View style={styles.header}>
        <View style={[styles.inner, { paddingHorizontal: S.lg, gap: S.sm }]}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Tap label="Back" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backBtn}>
              <ChevronLeft size={22} color={C.text} />
            </Tap>
            <Tap onPress={() => router.replace('/')} scale={0.95} label="MaaCrave home"><Wordmark size={28} /></Tap>
          </Row>
          {title ? (
            <Row style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <T v="title" numberOfLines={2} style={{ fontSize: 24, lineHeight: 29 }}>{title}</T>
                {sub ? <T v="meta" numberOfLines={1} style={{ marginTop: 2 }}>{sub}</T> : null}
              </View>
              {right}
            </Row>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.header}>
      <View style={[styles.inner, { paddingHorizontal: S.lg, gap: S.md }]}>
        <Wordmark />
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <T v="hero" numberOfLines={1} style={{ fontSize: 30, lineHeight: 34 }}>{title}</T>
            {sub ? <T v="sub" numberOfLines={1} style={{ marginTop: 2 }}>{sub}</T> : null}
          </View>
          {right}
        </Row>
      </View>
    </View>
  );
}
export function Section({ title, sub, action, onAction, children, style }: { title: string; sub?: string; action?: string; onAction?: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <FadeIn style={[{ gap: S.md, marginTop: S.xxl }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: S.md }}>
        <View style={{ flex: 1 }}>
          <T v="section">{title}</T>
          {sub ? <T v="sub" style={{ marginTop: 2 }}>{sub}</T> : null}
        </View>
        {action ? (
          <Tap onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <T v="label" color={C.brandText}>{action}</T>
            <ChevronRight size={16} color={C.brandText} />
          </Tap>
        ) : null}
      </View>
      {children}
    </FadeIn>
  );
}
export const Row = ({ children, gap = S.md, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>
);
/** Matte card on the white canvas. `white` gives a lifted white card with a soft shadow. */
export const Card = ({ children, style, onPress, accent, white }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: boolean; white?: boolean }) => {
  const st = [styles.card, white && styles.cardWhite, accent && { backgroundColor: C.brandSoft }, style];
  return onPress ? <Tap onPress={onPress} scale={0.985} style={st}>{children}</Tap> : <View style={st}>{children}</View>;
};
export const Divider = () => <View style={{ height: 1, backgroundColor: C.line2, opacity: 0.8 }} />;

/* ---------- buttons ---------- */
type BtnVariant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ok' | 'light';
export function Button({ title, sub, onPress, v = 'primary', size = 'md', loading, disabled, icon, style, full }: { title: string; sub?: string; onPress?: () => void; v?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean; disabled?: boolean; icon?: React.ReactNode; style?: StyleProp<ViewStyle>; full?: boolean }) {
  const tx = useTxt()(title, F.bold);
  const h = size === 'lg' ? 56 : size === 'sm' ? 38 : 48;
  const fg = v === 'primary' ? ON_GLOSS : v === 'dark' || v === 'ok' ? '#FFFFFF' : v === 'secondary' || v === 'light' ? C.brandText : v === 'danger' ? C.err : C.text;
  const bg = v === 'dark' ? C.ink : v === 'secondary' ? C.brandSoft : v === 'ok' ? C.ok : v === 'outline' || v === 'light' ? C.surface : 'transparent';
  const border = v === 'outline' ? C.line2 : v === 'danger' ? C.err + '40' : 'transparent';
  const content = (
    <View style={{ minHeight: sub ? 60 : h, paddingHorizontal: size === 'sm' ? 14 : S.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: S.sm }}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: tx.font, fontSize: size === 'sm' ? 13.5 : size === 'lg' ? 16 : 15, color: fg, letterSpacing: -0.1 }}>{tx.text}</Text>
            {sub ? <Text style={{ fontFamily: F.bn, fontSize: 13, color: fg, opacity: 0.85, marginTop: 1 }}>{sub}</Text> : null}
          </View>
        </>
      )}
    </View>
  );
  return (
    <Tap onPress={onPress} disabled={disabled || loading} scale={0.96}
      style={[{ borderRadius: R.pill, backgroundColor: bg, borderWidth: v === 'outline' || v === 'danger' ? 1 : 0, borderColor: border, opacity: disabled ? 0.42 : 1 }, full && { alignSelf: 'stretch' }, v === 'primary' && !disabled && (redShadow as object), style]}>
      {v === 'primary' ? (
        <View style={{ borderRadius: R.pill, overflow: 'hidden' }}>
          <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%' }} pointerEvents="none" />
          {content}
        </View>
      ) : content}
    </Tap>
  );
}
export function IconButton({ children, onPress, label, badge, tone = 'soft' }: { children: React.ReactNode; onPress: () => void; label: string; badge?: number; tone?: 'soft' | 'clear' | 'glass' }) {
  return (
    <Tap label={label} onPress={onPress} hitSlop={6} scale={0.9}
      style={[styles.iconBtn, tone === 'soft' && { backgroundColor: C.surface2 }, tone === 'glass' && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
      {children}
      {badge ? <View style={styles.badgeDot}><Text style={{ color: '#fff', fontFamily: F.bold, fontSize: 10 }}>{badge > 9 ? '9+' : badge}</Text></View> : null}
    </Tap>
  );
}
/** Round glossy “+” used on dish cards. */
export function AddButton({ onPress, disabled, label = 'Add to cart' }: { onPress: () => void; disabled?: boolean; label?: string }) {
  return (
    <Tap label={label} onPress={onPress} disabled={disabled} scale={0.86} style={[{ width: 38, height: 38, borderRadius: 19, opacity: disabled ? 0.35 : 1 }, !disabled && (redShadow as object)]}>
      <View style={{ flex: 1, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%' }} pointerEvents="none" />
        <View style={{ position: 'relative', zIndex: 1 }}><Plus size={19} color={ON_GLOSS} strokeWidth={2.6} /></View>
      </View>
    </Tap>
  );
}

/* ---------- inputs ---------- */
export function Field({ label, hint, error, children }: { label?: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <T v="label" color={C.text}>{label}</T> : null}
      {children}
      {error ? <T v="meta" color={C.err}>{error}</T> : hint ? <T v="meta">{hint}</T> : null}
    </View>
  );
}
export function Input({ label, hint, error, prefix, style, ...rest }: TextInputProps & { label?: string; hint?: string; error?: string | null; prefix?: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      <View style={[styles.input, focus && styles.inputFocus, !!error && { borderColor: C.err, backgroundColor: C.errSoft }, rest.multiline && { minHeight: 96, alignItems: 'flex-start', paddingVertical: 12 }]}>
        {prefix ? <Text style={{ fontFamily: F.semibold, fontSize: 15, color: C.text2, marginRight: 10 }}>{prefix}</Text> : null}
        <TextInput placeholderTextColor="#ADA4A4" selectionColor={C.brand} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          {...rest} placeholder={tr(rest.placeholder)} style={[{ flex: 1, fontFamily: F.medium, fontSize: 15, color: C.text, minHeight: 22 }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), style]} />
      </View>
    </Field>
  );
}
export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress: () => void; icon?: React.ReactNode }) {
  const tx = useTxt()(label, on ? F.bold : F.semibold);
  return (
    <Tap onPress={onPress} scale={0.94} role="button" style={[styles.chip, on && { backgroundColor: C.brand, borderColor: C.brand }]}>
      {icon}
      {label ? <Text style={{ fontFamily: tx.font, fontSize: 13.5, color: on ? '#fff' : C.text2 }}>{tx.text}</Text> : null}
    </Tap>
  );
}
export function Choice({ label, sub, on, onPress, right, disabled }: { label: string; sub?: string; on: boolean; onPress: () => void; right?: React.ReactNode; disabled?: boolean }) {
  return (
    <Tap role="radio" onPress={onPress} disabled={disabled} scale={0.985} style={[styles.choice, on && { borderColor: C.brand, backgroundColor: C.brandSoft }, disabled && { opacity: 0.5 }]}>
      <View style={[styles.radio, on && { borderColor: C.brand, backgroundColor: C.brand }]}>{on ? <Check size={12} color="#fff" strokeWidth={3.2} /> : null}</View>
      <View style={{ flex: 1 }}>
        <T v="label">{label}</T>
        {sub ? <T v="meta" style={{ marginTop: 2 }}>{sub}</T> : null}
      </View>
      {right}
    </Tap>
  );
}
export function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const txt = useTxt();
  return (
    <View style={styles.seg}>
      {items.map((i) => {
        const on = value === i.key;
        return (
          <Tap key={i.key} onPress={() => onChange(i.key)} scale={0.95} style={[styles.segItem, on && styles.segOn]}>
            <Text numberOfLines={1} style={{ fontFamily: txt(i.label, on ? F.bold : F.semibold).font, fontSize: 13.5, color: on ? '#fff' : C.text2 }}>{txt(i.label, F.bold).text}</Text>
          </Tap>
        );
      })}
    </View>
  );
}
export function Stepper({ value, onChange, min = 1, max = 50, large }: { value: number; onChange: (n: number) => void; min?: number; max?: number; large?: boolean }) {
  const h = large ? 46 : 38;
  const btn = (Icon: LucideIcon, label: string, fn: () => void, off: boolean, primary?: boolean) => (
    <Tap label={label} onPress={fn} disabled={off} scale={0.85} style={{ width: h - 8, height: h - 8, borderRadius: (h - 8) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? C.brand : C.surface, opacity: off ? 0.35 : 1 }}>
      <Icon size={16} color={primary ? '#fff' : C.text} strokeWidth={2.6} />
    </Tap>
  );
  return (
    <View style={[styles.stepper, { height: h }]}>
      {btn(Minus, 'Decrease', () => onChange(Math.max(min, value - 1)), value <= min)}
      <Text style={{ minWidth: 30, textAlign: 'center', fontFamily: F.display, fontSize: large ? 18 : 16, color: C.text }}>{value}</Text>
      {btn(Plus, 'Increase', () => onChange(Math.min(max, value + 1)), value >= max, true)}
    </View>
  );
}
/** Switch with its label. Pass `bare` to render only the switch. */
export function Toggle({ value, onChange, label, sub, bare }: { value: boolean; onChange: (v: boolean) => void; label: string; sub?: string; bare?: boolean }) {
  const sw = <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: C.brand, false: C.line2 }} thumbColor="#FFFFFF" {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {})} />;
  if (bare) return sw;
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      <View style={{ flex: 1 }}><T v="card" style={{ fontSize: 15 }}>{label}</T>{sub ? <T v="meta" style={{ marginTop: 2 }}>{sub}</T> : null}</View>
      {sw}
    </Pressable>
  );
}

/* ---------- status ---------- */
const TONE: Record<string, [string, string]> = { ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], err: [C.errSoft, C.err], info: [C.infoSoft, C.info], brand: [C.brandSoft, C.brandText], neutral: [C.sunken, C.text2] };
export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: keyof typeof TONE; icon?: React.ReactNode }) {
  const [bg, fg] = TONE[tone];
  const tx = useTxt()(label, F.bold);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 10, height: 24, alignSelf: 'flex-start' }}>
      {icon}
      <Text style={{ fontFamily: tx.font, fontSize: 11.5, color: fg }}>{tx.text}</Text>
    </View>
  );
}
export const StatusBadge = ({ status }: { status: OrderStatus }) => <Badge label={STATUS_LABEL[status]} tone={statusTone(status)} />;
export function Meter({ value, max, ok }: { value: number; max: number; ok?: boolean }) {
  const w = useRef(new Animated.Value(0)).current;
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  useEffect(() => { Animated.timing(w, { toValue: pct, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [pct, w]);
  return (
    <View style={{ height: 8, borderRadius: 8, backgroundColor: C.sunken, overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 8, overflow: 'hidden', width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
        <LinearGradient colors={ok ? ['#2E9E66', C.ok] : [C.brandHi, C.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}
export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <Row gap={3}>
      <Star size={13} color={C.star} fill={C.star} />
      <Text style={{ fontFamily: F.bold, fontSize: 12.5, color: C.text }}>{value ? value.toFixed(1) : 'New'}</Text>
      {count != null && value ? <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.muted }}>({count > 999 ? (count / 1000).toFixed(1) + 'k' : count})</Text> : null}
    </Row>
  );
}
export function Avatar({ name, size = 44, color }: { name: string; size?: number; color?: string }) {
  const ini = name.replace(/[’']s\b.*/, '').split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '•';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
      {color ? null : <LinearGradient colors={MAROON} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Text style={{ color: '#fff', fontFamily: F.display, fontSize: size * 0.38 }}>{ini}</Text>
    </View>
  );
}
export function Empty({ Icon, title, text, action, onAction }: { Icon: LucideIcon; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <FadeIn style={{ alignItems: 'center', paddingVertical: S.x4, paddingHorizontal: S.lg, gap: S.sm }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: S.sm }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...(shadow as object) }}>
          <Icon size={24} color={C.brand} />
        </View>
      </View>
      <T v="section" center>{title}</T>
      <T v="sub" center style={{ maxWidth: 340 }}>{text}</T>
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: S.md }} /> : null}
    </FadeIn>
  );
}
/** Skeleton cards while data loads. */
export const Loading = ({ rows = 3 }: { rows?: number }) => (
  <View style={{ gap: S.md, paddingVertical: S.sm }} accessibilityLabel="Loading">
    {Array.from({ length: rows }, (_, i) => (
      <View key={i} style={[styles.card, { gap: S.md }]}>
        <Row><Skeleton h={48} w={48} r={14} /><View style={{ flex: 1, gap: 8 }}><Skeleton h={14} w="60%" /><Skeleton h={11} w="40%" /></View></Row>
        <Skeleton h={11} w="90%" />
      </View>
    ))}
  </View>
);
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: S.x4, gap: S.sm }}>
      <T v="section">Couldn’t load this</T>
      <T v="sub" center style={{ maxWidth: 340 }}>{(error as Error)?.message || 'Please try again.'}</T>
      <Button title="Try again" v="outline" size="sm" onPress={onRetry} style={{ marginTop: S.sm }} />
    </View>
  );
}
export function Note({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONE }) {
  const [bg, fg] = TONE[tone];
  const tx = useTxt()(typeof children === 'string' ? children : undefined, F.medium);
  return <View style={{ backgroundColor: tone === 'neutral' ? C.card : bg, borderRadius: R.md, padding: 14 }}><Text style={{ fontFamily: tx.font, fontSize: 13.5, lineHeight: 20, color: tone === 'neutral' ? C.text2 : fg }}>{typeof children === 'string' ? tx.text : children}</Text></View>;
}
export function KV({ k, v, strong, color }: { k: string; v: string; strong?: boolean; color?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: strong ? 10 : 4, borderTopWidth: strong ? 1 : 0, borderTopColor: C.line2, marginTop: strong ? 6 : 0 }}>
      <T v={strong ? 'card' : 'sub'} color={color || (strong ? C.text : C.text2)} style={{ flexShrink: 1 }}>{k}</T>
      <T v={strong ? 'price' : 'label'} color={color || C.text} style={{ textAlign: 'right', marginLeft: S.md }}>{v}</T>
    </Row>
  );
}

/* ---------- domain cards ---------- */
export function DishCard({ d, onAdd, saved, onToggleSave, groupPrice }: { d: Dish & { cook?: CookPublic }; onAdd?: () => void; saved?: boolean; onToggleSave?: () => void; groupPrice?: number }) {
  const lang = useLang();
  const { me } = useAuth();
  const hits = allergyHits(d, me?.allergies);
  const photo = mediaUrl(d.photoId);
  const region = regionOf(d);
  const tags = (d.healthTags || []).filter((k) => HEALTH[k]).slice(0, 2);
  return (
    <Card onPress={() => router.push(`/dish/${d.id}`)} style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ padding: S.lg, paddingBottom: S.md, gap: S.md }}>
        <Row style={{ alignItems: 'flex-start' }}>
          {photo ? <Image source={{ uri: photo }} style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: C.sunken }} resizeMode="cover" /> : <CategoryTile category={d.category} size={58} solid />}
          <View style={{ flex: 1, gap: 3 }}>
            <T v="card" numberOfLines={1} style={{ fontSize: 16.5 }}>{d.name}</T>
            {d.cook ? (
              <Row gap={4}>
                <T v="meta" numberOfLines={1} style={{ flexShrink: 1 }}>{d.cook.displayName}</T>
                <BadgeCheck size={13} color={C.brand} />
              </Row>
            ) : null}
            <Row gap={8} style={{ marginTop: 2 }}>
              <Rating value={d.rating} count={d.ratingCount} />
              <Row gap={3}><Clock size={12} color={C.muted} /><T v="meta">{d.prepMinutes + 20}m</T></Row>
            </Row>
          </View>
          {onToggleSave ? (
            <Tap label={saved ? 'Remove from favourites' : 'Save to favourites'} hitSlop={10} onPress={onToggleSave} scale={0.8}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={17} color={saved ? C.brand : C.muted} fill={saved ? C.brand : 'transparent'} />
            </Tap>
          ) : null}
        </Row>
        {d.description ? <T v="sub" numberOfLines={2} color={C.text2}>{d.description}</T> : null}
        {tags.length || (region && REGIONS[region]) ? (
          <Row gap={6} wrap>
            {region && REGIONS[region] ? <View style={[styles.miniPill, { backgroundColor: C.brandSoft }]}><Text style={[styles.miniTx, { color: C.brandText, fontFamily: lang === 'bn' ? F.bnBold : F.semibold }]}>{lang === 'bn' ? bnOf(REGIONS[region].bn) + ' রান্না' : REGIONS[region].en + ' recipe'}</Text></View> : null}
            {tags.map((k) => <View key={k} style={[styles.miniPill, { backgroundColor: HEALTH[k].color + '14' }]}><Text style={[styles.miniTx, { color: HEALTH[k].color, fontFamily: lang === 'bn' ? F.bnBold : F.semibold }]}>{lang === 'bn' ? HEALTH[k].bn : HEALTH[k].en}</Text></View>)}
          </Row>
        ) : null}
        {hits.length ? (
          <Row gap={6} style={{ backgroundColor: C.errSoft, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
            <AlertTriangle size={13} color={C.err} />
            <T v="meta" color={C.err} style={{ flex: 1 }}>{lang === 'bn' ? 'আপনার অ্যালার্জির উপাদান আছে' : `Contains ${hits.join(', ').toLowerCase()}`}</T>
          </Row>
        ) : null}
      </View>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: S.lg, paddingBottom: S.lg }}>
        <View>
          <T v="price" style={{ fontSize: 20 }}>{tk(d.price)}</T>
          {groupPrice ? <Row gap={4}><Users size={12} color={C.brandText} /><T v="meta" color={C.brandText}>{tk(groupPrice)} in a group</T></Row> : <T v="meta">{d.portion}</T>}
        </View>
        {onAdd ? <AddButton onPress={onAdd} disabled={!d.available} /> : null}
      </Row>
    </Card>
  );
}
export function BatchCard({ b }: { b: Batch }) {
  const open = b.status === 'OPEN' && new Date(b.cutoffAt) > new Date();
  const left = Math.max(0, b.maxPortions - b.filled);
  return (
    <Card onPress={() => router.push(`/batch/${b.id}`)} style={{ gap: S.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <CategoryTile category={b.dish?.category || 'lunch'} size={52} solid />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="card" numberOfLines={1}>{b.title}</T>
          <T v="meta" numberOfLines={1}>{b.cook?.displayName} · {b.area}</T>
        </View>
        {b.myOrderId ? <Badge tone="ok" label="Joined" /> : open ? <Badge tone="brand" label={countdown(b.cutoffAt)} icon={<Clock size={11} color={C.brandText} />} /> : null}
      </Row>
      <View style={{ gap: 8 }}>
        <Meter value={b.filled} max={b.maxPortions} ok={b.filled >= b.minPortions} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="meta"><Text style={{ color: C.text, fontFamily: F.bold }}>{b.filled}/{b.maxPortions}</Text> portions</T>
          <T v="meta">{b.filled < b.minPortions ? `${b.minPortions - b.filled} more to start` : `${left} left`}</T>
        </Row>
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="price" style={{ fontSize: 20 }}>{tk(b.pricePerPortion)}<Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.muted }}> / portion</Text></T>
        {open ? (
          <View style={{ backgroundColor: b.myOrderId ? C.surface : C.ink, borderRadius: R.pill, paddingHorizontal: 16, height: 36, justifyContent: 'center' }}>
            <Text style={{ color: b.myOrderId ? C.text : '#fff', fontFamily: F.bold, fontSize: 13.5 }}>{b.myOrderId ? 'View' : 'Join'}</Text>
          </View>
        ) : <T v="meta">{b.status.charAt(0) + b.status.slice(1).toLowerCase()}</T>}
      </Row>
    </Card>
  );
}
export function CookCard({ c }: { c: CookPublic }) {
  return (
    <Card onPress={() => router.push(`/cook/${c.id}`)}>
      <Row>
        {mediaUrl(c.portraitId) ? <Image source={{ uri: mediaUrl(c.portraitId)! }} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: C.turmeric, backgroundColor: C.sunken }} /> : <Avatar name={c.displayName} size={50} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={4}><T v="card" numberOfLines={1} style={{ flexShrink: 1 }}>{c.displayName}</T><BadgeCheck size={15} color={C.brand} /></Row>
          <T v="meta" numberOfLines={1}>{c.specialties.slice(0, 2).join(' · ') || c.area}</T>
          <Row gap={6}><Rating value={c.rating} count={c.ratingCount} /><T v="meta">· {c.area}</T></Row>
        </View>
      </Row>
    </Card>
  );
}
export function OrderCard({ o, onPress }: { o: Order; onPress?: () => void }) {
  return (
    <Card onPress={onPress || (() => router.push(`/order/${o.id}`))}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}><Utensils size={20} color={C.brand} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T v="card" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</T>
            <T v="price" style={{ fontSize: 16 }}>{tk(o.total)}</T>
          </Row>
          <T v="meta" numberOfLines={1}>{o.cook.displayName} · {o.code}</T>
          <View style={{ marginTop: 6 }}><StatusBadge status={o.status} /></View>
        </View>
      </Row>
    </Card>
  );
}
export function ActionArrow({ label, color = C.brandText }: { label: string; color?: string }) {
  return <Row gap={6}><T v="label" color={color}>{label}</T><ChevronRight size={16} color={color} /></Row>;
}

/* ---------- toast & confirm ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => undefined);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const a = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const insets = useSafeAreaInsets();
  const show = useCallback((m: string) => {
    setMsg(tr(m));
    Animated.spring(a, { toValue: 1, useNativeDriver: ND, speed: 18, bounciness: 7 }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: ND }).start(() => setMsg(null)), 2600);
  }, [a]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => onAppError(show), [show]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <Animated.View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + 96, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.brandHi }} />
          <Text style={{ color: '#fff', fontFamily: F.semibold, fontSize: 14, flexShrink: 1 }}>{msg}</Text>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
export function confirm(rawTitle: string, rawMessage: string, rawOk = 'OK', destructive = false): Promise<boolean> {
  const title = tr(rawTitle); const message = tr(rawMessage); const ok = tr(rawOk);
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) => Alert.alert(title, message, [{ text: tr('Cancel'), style: 'cancel', onPress: () => resolve(false) }, { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
}

const styles = StyleSheet.create({
  miniPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 22, borderRadius: 999 },
  miniTx: { fontSize: 11.5 },
  screen: { flex: 1, backgroundColor: C.bg },
  inner: { width: '100%', maxWidth: MAX_W, alignSelf: 'center' },
  header: { backgroundColor: C.bg, paddingVertical: S.sm },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.surface, paddingTop: S.md, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: C.line },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: 1, borderColor: C.line },
  cardWhite: { backgroundColor: C.surface, ...(shadow as object) },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  input: { minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  inputFocus: { borderColor: C.brand, backgroundColor: C.surface },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: 16, borderWidth: 1, borderColor: C.line2, borderRadius: R.md, backgroundColor: C.surface },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  seg: { flexDirection: 'row', backgroundColor: C.sunken, borderRadius: R.pill, padding: 4, gap: 2, alignSelf: 'flex-start', maxWidth: '100%' },
  segItem: { height: 36, paddingHorizontal: 16, borderRadius: R.pill, justifyContent: 'center' },
  segOn: { backgroundColor: C.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: R.pill, backgroundColor: C.surface2, paddingHorizontal: 4, gap: 4 },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.ink, paddingHorizontal: 18, paddingVertical: 13, borderRadius: R.pill, maxWidth: 440, marginHorizontal: S.lg, ...(shadow as object) },
});
