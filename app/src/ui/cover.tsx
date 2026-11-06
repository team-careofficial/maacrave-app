import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, F, S } from '../theme';
import { T, Wordmark } from './index';

/** The orange cover band at the top of each mode's home screen, ending in the MaaCrave wave. */
export function CoverBand({ eyebrow, title, sub, right, children }: { eyebrow?: string; title: string; sub?: string; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View>
      <View style={{ backgroundColor: C.brand, paddingBottom: S.xl }}>
        <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: S.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <Wordmark size={34} onDark />
            {right}
          </View>
          {eyebrow ? <T v="eyebrow" color="rgba(255,255,255,0.82)" style={{ marginTop: S.lg }}>{eyebrow}</T> : null}
          <T v="hero" color="#fff" style={{ marginTop: eyebrow ? 4 : S.lg, fontFamily: F.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 }} numberOfLines={2}>{title}</T>
          {sub ? <T v="sub" color="rgba(255,255,255,0.88)" style={{ marginTop: 2 }}>{sub}</T> : null}
          {children}
        </View>
      </View>
      <Svg width="100%" height={34} viewBox="0 0 400 34" preserveAspectRatio="none" style={{ marginTop: -1 }}>
        <Path d="M0 0 H400 V10 C320 38 250 34 190 22 C120 8 60 6 0 26 Z" fill={C.brand} />
      </Svg>
    </View>
  );
}
