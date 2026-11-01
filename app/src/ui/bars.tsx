import { View } from 'react-native';
import { tk } from '../format';
import { C, S } from '../theme';
import { T } from './index';

/** Minimal 7-day earnings bars. Today is highlighted. */
export function Bars({ data }: { data: { date: string; amount: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, height: 120 }}>
      {data.map((d, i) => {
        const today = i === data.length - 1;
        return (
          <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityLabel={`${d.date}: ${tk(d.amount)}`}>
            <View style={{ width: '100%', maxWidth: 34, height: Math.max(4, (d.amount / max) * 88), borderRadius: 6, backgroundColor: today ? C.brand : '#F3D3D4' }} />
            <T v="meta" color={today ? C.text : C.muted}>{new Date(d.date).toLocaleDateString('en-GB', { weekday: 'narrow' })}</T>
          </View>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 140, backgroundColor: C.card, borderRadius: 20, padding: S.lg, gap: 4 }}>
      <T v="meta">{label}</T>
      <T v="big" style={{ fontSize: 24 }}>{value}</T>
      {sub ? <T v="meta">{sub}</T> : null}
    </View>
  );
}
