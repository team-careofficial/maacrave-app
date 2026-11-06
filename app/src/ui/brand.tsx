import type React from 'react';
import { View } from 'react-native';
import { C } from '@/theme';
import { T, Wordmark } from './index';
import { Logo } from './logo';

export { Logo };

/** Logo + name. `light` = on a dark background; `onTurmeric` = on the turmeric theme colour (white logo tile, dark text). */
export function Brand({ light, onTurmeric }: { light?: boolean; onTurmeric?: boolean }) {
  // on paprika: white tile, white name with a mango 'Crave'
  if (onTurmeric) light = true;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Logo inverse={light} />
      <T v="section" color={light ? '#fff' : C.text} style={{ fontSize: 23 }}>Maa<T v="section" color={light ? '#FFFFFF' : C.brand} style={{ fontSize: 23 }}>Crave</T></T>
    </View>
  );
}

/** Logo + wordmark for the top-left corner of the main screens, with actions on the right. */
export function BrandBar({ right, sub }: { right?: React.ReactNode; sub?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, width: '100%', maxWidth: 1080, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Wordmark size={36} />
        {sub ? <T v="meta" numberOfLines={1} style={{ marginTop: 4 }}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
}
