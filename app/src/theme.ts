import { Platform } from 'react-native';

export const C = {
  // Surfaces: white canvas, warm matte fills, hairline borders
  bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F6F3F1', sunken: '#EEEAE7', card: '#FFFFFF',
  // Ink (warm, never pure black)
  text: '#1D1617', text2: '#5C5253', muted: '#8B8182', line: '#EEE9E7', line2: '#E2DCDA',
  // Gold accent: ratings, rings, small highlights. Dark text on it.
  turmeric: '#E9A23B', turmericDeep: '#C9861F', turmericSoft: '#FCF1DE', onTurmeric: '#4A2E0A',
  // Burgundy (crimson) brand
  brand: '#A9151B', brand2: '#C21D23', brandHi: '#E2373C', brandDark: '#7C0E13', brandDeep: '#4A080B', brandSoft: '#FBEEEE', brandText: '#A0141A',
  ink: '#231A1B', onInk: '#FFFFFF',
  ok: '#1E7F4F', okSoft: '#E8F5EE', warn: '#9A6200', warnSoft: '#FDF4E1', err: '#C62828', errSoft: '#FDECEC', info: '#2552C9', infoSoft: '#EDF2FE',
  star: '#E9A23B', gold: '#E9A23B',
};
/** The one deep burgundy used everywhere (intro, banners, buttons, logo) — same as the launch screen. White text on it. */
export const GLOSS = ['#941219', '#7A0D12', '#5A090D'] as const;
/** Burgundy for avatars and small solid accents that carry white text. */
export const MAROON = ['#B8191F', '#A9151B', '#7C0E13'] as const;
export const ON_GLOSS = '#FFFFFF';
export const ON_GLOSS_SOFT = 'rgba(255,255,255,0.84)';
/** Gold accent gradient (portrait rings). */
export const MANGO = ['#F2B95A', '#E9A23B', '#D48C25'] as const;
/** Matte deep maroon (dark surfaces). */
export const MATTE = ['#3B1013', '#2A0B0D'] as const;
/** Top highlight laid over glossy surfaces. */
export const SHEEN = ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'] as const;

/** 8-point spacing scale */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40, x5: 48 };
export const R = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 };

export const F = {
  regular: 'PlusJakartaSans_400Regular', medium: 'PlusJakartaSans_500Medium', semibold: 'PlusJakartaSans_600SemiBold', bold: 'PlusJakartaSans_700Bold',
  display: 'BricolageGrotesque_700Bold', displaySemi: 'BricolageGrotesque_600SemiBold', displayX: 'BricolageGrotesque_800ExtraBold',
  bn: 'HindSiliguri_400Regular', bnBold: 'HindSiliguri_600SemiBold',
};

/** Type scale. Display face for headings and prices, Plus Jakarta Sans for reading. */
export const TYPE = {
  hero: { fontFamily: F.displayX, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  title: { fontFamily: F.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  section: { fontFamily: F.display, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  card: { fontFamily: F.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.15 },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  sub: { fontFamily: F.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: F.semibold, fontSize: 13.5, lineHeight: 18 },
  meta: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 16 },
  eyebrow: { fontFamily: F.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  price: { fontFamily: F.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, fontVariant: ['tabular-nums' as const] },
  big: { fontFamily: F.displayX, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, fontVariant: ['tabular-nums' as const] },
};
export type TypeKey = keyof typeof TYPE;

export const shadow = Platform.select({
  ios: { shadowColor: '#2A0B0D', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 4 },
  default: { boxShadow: '0 10px 30px -14px rgba(42,11,13,.2)' } as object,
});
export const redShadow = Platform.select({
  ios: { shadowColor: '#2A0B0D', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 3 },
  default: { boxShadow: '0 8px 18px -12px rgba(42,11,13,.35)' } as object,
});

export const CATEGORY_META: Record<string, { label: string; bn: string; icon: string; color: string }> = {
  rice: { label: 'Rice & Biryani', bn: 'ভাত ও বিরিয়ানি', icon: 'soup', color: '#B45309' },
  bengali: { label: 'Bengali Meals', bn: 'বাঙালি খাবার', icon: 'utensils', color: '#C2410C' },
  fish: { label: 'Fish', bn: 'মাছ', icon: 'fish', color: '#0369A1' },
  chicken: { label: 'Chicken', bn: 'মুরগি', icon: 'drumstick', color: '#C2410C' },
  beef: { label: 'Beef', bn: 'গরু', icon: 'beef', color: '#B91C1C' },
  veg: { label: 'Vegetables', bn: 'সবজি', icon: 'leaf', color: '#15803D' },
  snacks: { label: 'Snacks', bn: 'নাস্তা', icon: 'cookie', color: '#A16207' },
  breakfast: { label: 'Breakfast', bn: 'সকালের নাস্তা', icon: 'sun', color: '#B45309' },
  lunch: { label: 'Lunch', bn: 'দুপুরের খাবার', icon: 'utensils', color: '#C2410C' },
  dinner: { label: 'Dinner', bn: 'রাতের খাবার', icon: 'moon', color: '#4338CA' },
  dessert: { label: 'Desserts', bn: 'মিষ্টান্ন', icon: 'cake', color: '#BE185D' },
  healthy: { label: 'Healthy', bn: 'স্বাস্থ্যকর', icon: 'leaf', color: '#15803D' },
};
