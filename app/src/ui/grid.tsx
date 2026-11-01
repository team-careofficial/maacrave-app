import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { S } from '../theme';

export function useCols(max = 3) {
  const { width } = useWindowDimensions();
  return Math.min(max, width >= 1000 ? 3 : width >= 640 ? 2 : 1);
}
/** Responsive grid: 1 column on phones, 2 on tablets, 3 on desktop. */
export function Grid({ children, max = 3, gap = S.md }: { children: React.ReactNode; max?: number; gap?: number }) {
  const cols = useCols(max);
  const items = React.Children.toArray(children);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {items.map((c, i) => <View key={i} style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2, paddingBottom: gap }}>{c}</View>)}
    </View>
  );
}
