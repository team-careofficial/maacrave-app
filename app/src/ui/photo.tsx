import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, View } from 'react-native';
import { API } from '../api';
import { mediaUrl } from '../maa';
import { C, R, S } from '../theme';
import { T, Tap } from './index';

/** Resizes to max 1280 px and JPEG-compresses, so a phone photo becomes roughly 150–300 kB. */
async function compress(uri: string) {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}

async function pick(source: 'camera' | 'library') {
  if (source === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error('Allow camera access in your phone settings to take a photo.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    return r.canceled ? null : r.assets[0].uri;
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  return r.canceled ? null : r.assets[0].uri;
}

/** One verification photo slot (NID, kitchen, licence). Value is a data URL or null. */
export function PhotoSlot({ label, value, onChange, required }: { label: string; value: string | null; onChange: (v: string | null) => void; required?: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = async (source: 'camera' | 'library') => {
    try {
      const uri = await pick(source);
      if (!uri) return;
      setBusy(true);
      onChange(await compress(uri));
    } catch (e) {
      Platform.OS === 'web' ? globalThis.alert?.((e as Error).message) : Alert.alert('Photo', (e as Error).message);
    } finally { setBusy(false); }
  };
  const choose = () => {
    if (Platform.OS === 'web') return run('library');
    Alert.alert(label, undefined, [{ text: 'Take photo', onPress: () => run('camera') }, { text: 'Choose from gallery', onPress: () => run('library') }, { text: 'Cancel', style: 'cancel' }]);
  };
  return (
    <View style={{ width: 150, gap: 6 }}>
      <Tap onPress={choose} scale={0.96} label={label}
        style={{ height: 110, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.surface2, borderWidth: 1.5, borderStyle: value ? 'solid' : 'dashed', borderColor: value ? C.line2 : C.brand + '66', alignItems: 'center', justifyContent: 'center' }}>
        {busy ? <ActivityIndicator color={C.brand} /> : value ? (
          <Image source={{ uri: value }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            {Platform.OS === 'web' ? <ImagePlus size={24} color={C.brand} /> : <Camera size={24} color={C.brand} />}
            <T v="meta" color={C.brandText}>Add photo</T>
          </View>
        )}
      </Tap>
      {value ? (
        <Tap onPress={() => onChange(null)} label={`Remove ${label}`} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} color="#fff" />
        </Tap>
      ) : null}
      <T v="meta" color={C.text2}>{label}{required ? ' *' : ''}</T>
    </View>
  );
}

export const PhotoRow = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>{children}</View>;

/**
 * A photo the cook uploads straight away (dish, her portrait, her kitchen). Value is the uploaded photo's id.
 * Wide slots suit dishes and kitchens; round ones suit a portrait.
 */
export function MediaSlot({ kind, value, onChange, label, hint, round }: { kind: 'DISH' | 'PORTRAIT' | 'KITCHEN'; value: string | null | undefined; onChange: (id: string | null) => void; label: string; hint?: string; round?: boolean }) {
  const [busy, setBusy] = useState(false);
  const say = (m: string) => (Platform.OS === 'web' ? globalThis.alert?.(m) : Alert.alert('Photo', m));
  const run = async (source: 'camera' | 'library') => {
    try {
      const uri = await pick(source);
      if (!uri) return;
      setBusy(true);
      const r = await API.uploadPhoto(kind, await compress(uri));
      onChange(r.id);
    } catch (e) { say((e as Error).message); } finally { setBusy(false); }
  };
  const choose = () => {
    if (Platform.OS === 'web') return run('library');
    Alert.alert(label, undefined, [{ text: 'Take photo', onPress: () => run('camera') }, { text: 'Choose from gallery', onPress: () => run('library') }, { text: 'Cancel', style: 'cancel' }]);
  };
  const uri = mediaUrl(value);
  const box = round ? { width: 112, height: 112, borderRadius: 56 } : { width: '100%' as const, aspectRatio: 4 / 3, borderRadius: R.lg };
  return (
    <View style={{ gap: 6, alignItems: round ? 'center' : 'stretch' }}>
      <View style={round ? undefined : { width: '100%' }}>
        <Tap onPress={choose} scale={0.97} label={label}
          style={{ ...box, overflow: 'hidden', backgroundColor: C.turmericSoft, borderWidth: 1.5, borderStyle: uri ? 'solid' : 'dashed', borderColor: uri ? C.turmeric : C.turmericDeep, alignItems: 'center', justifyContent: 'center' }}>
          {busy ? <ActivityIndicator color={C.brand} /> : uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 4, padding: 8 }}>
              {Platform.OS === 'web' ? <ImagePlus size={26} color={C.brand} /> : <Camera size={26} color={C.brand} />}
              <T v="label" color={C.brandText} center>{label}</T>
            </View>
          )}
        </Tap>
        {uri && !busy ? (
          <Tap onPress={() => onChange(null)} label={`Remove ${label}`} style={{ position: 'absolute', top: 8, right: round ? 0 : 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="#fff" />
          </Tap>
        ) : null}
      </View>
      {hint ? <T v="meta" center={round}>{hint}</T> : null}
    </View>
  );
}
