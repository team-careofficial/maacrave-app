import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, GLOSS, SHEEN } from '../theme';

/** App mark: a home roof with a heart over a bowl. `inverse` draws a white tile with a crimson mark. */
export function Logo({ size = 40, inverse }: { size?: number; inverse?: boolean }) {
  // Paprika tile with a cream mark (or a white tile with a paprika mark when `inverse`).
  const fg = inverse ? C.brand : '#fff';
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: inverse ? '#fff' : undefined }}>
      {inverse ? null : (
        <>
          <LinearGradient colors={GLOSS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <LinearGradient colors={SHEEN} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '50%' }} />
        </>
      )}
      {/* wrapped so the mark sits above the gradient on the website too */}
      <View style={{ position: 'relative', zIndex: 1 }}>
      <Svg width={size * 0.78} height={size * 0.78} viewBox="6 4 52 52">
        <Path d="M32 16.2c-2.3-1.8-5.2-3.6-5.2-5.8 0-2.5 3.2-3.4 5.2-1.3 2-2.1 5.2-1.2 5.2 1.3 0 2.2-2.9 4-5.2 5.8z" fill={fg} />
        <Path d="M13.5 32 32 21l18.5 11" fill="none" stroke={fg} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 35.5h32v5.2C48 47.5 42.5 53 35.7 53h-7.4C21.5 53 16 47.5 16 40.7z" fill={fg} />
        <Path d="M26 42.5c3.6 3 8.4 3 12 0" fill="none" stroke={inverse ? '#fff' : C.brand2} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
      </View>
    </View>
  );
}
