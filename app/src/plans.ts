import { Coffee, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import { num, t } from './i18n';
import type { MealSlot, PlanPeriod, SubscriptionStatus } from './types';

export const MEALS: { key: MealSlot; label: string; Icon: LucideIcon; bg: string; fg: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast', Icon: Coffee, bg: '#FFF4E3', fg: '#9A5A00' },
  { key: 'LUNCH', label: 'Lunch', Icon: Sun, bg: '#FBE6E6', fg: '#A9151B' },
  { key: 'DINNER', label: 'Dinner', Icon: Moon, bg: '#ECEBFA', fg: '#3D3591' },
];
export const mealOf = (m: MealSlot) => MEALS.find((x) => x.key === m) || MEALS[1];
export const PERIOD_LABEL: Record<PlanPeriod, string> = { WEEKLY: 'Weekly', MONTHLY: 'Monthly' };
export const PERIOD_DAYS: Record<PlanPeriod, number> = { WEEKLY: 7, MONTHLY: 30 };
export const SUB_LABEL: Record<SubscriptionStatus, string> = { ACTIVE: 'Active', PAUSED: 'Paused', CANCELLED: 'Cancelled', ENDED: 'Ended' };
export const SUB_TONE: Record<SubscriptionStatus, 'ok' | 'warn' | 'err' | 'neutral'> = { ACTIVE: 'ok', PAUSED: 'warn', CANCELLED: 'err', ENDED: 'neutral' };

const DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
export const dayName = (d: number) => t(DAY_EN[d], DAY_BN[d]);
export const DAY_KEYS = [6, 0, 1, 2, 3, 4, 5]; // Bangladesh week starts on Saturday
export function daysText(days: number[]) {
  if (days.length === 7) return t('Every day', 'প্রতিদিন');
  return DAY_KEYS.filter((d) => days.includes(d)).map(dayName).join(', ');
}
/** Meals in a plan: how many delivery days fall inside its 7 or 30 days. */
export function mealsInPlan(days: number[], period: PlanPeriod, start = new Date()) {
  let n = 0;
  for (let i = 0; i < PERIOD_DAYS[period]; i++) { const d = new Date(start.getTime() + i * 86400_000); if (days.includes(d.getDay())) n++; }
  return n;
}
/** "13:30" → "1:30 PM" */
export function timeText(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  const s = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
  return num(s) + ' ' + (h < 12 ? t('AM', 'সকাল') : t('PM', 'বিকাল'));
}
/** Dhaka date as YYYY-MM-DD, `plus` days from today. */
export function dhakaDate(plus = 0) {
  const d = new Date(Date.now() + 6 * 3600_000 + plus * 86400_000);
  return d.toISOString().slice(0, 10);
}
