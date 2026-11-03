import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Download, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, View } from 'react-native';
import { t, useLang } from '../i18n';
import { C, R, S } from '../theme';
import { Button, T } from './index';

/** Set by the Android build (GitHub Actions); empty in development, which disables the check. */
export const BUILD = { sha: process.env.EXPO_PUBLIC_BUILD_SHA || '', builtAt: process.env.EXPO_PUBLIC_BUILD_TIME || '' };
const BASE = 'https://github.com/team-careofficial/maacrave-app/releases/download/android-latest';
const CHECK_EVERY_MS = 30 * 60_000;

type Latest = { sha: string; builtAt: string; notes?: { en?: string; bn?: string }; url: string };

/**
 * Android app updates without the Play Store: checks the latest published build when the app opens
 * (and every 30 minutes while it's in use). If there's a newer one, it shows a card; “Update now”
 * downloads it inside the app and opens Android's installer, so the user just taps Install.
 */
export function AppUpdate() {
  const lang = useLang();
  const [latest, setLatest] = useState<Latest | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (Platform.OS !== 'android' || !BUILD.sha || Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
    lastCheck.current = Date.now();
    try {
      const r = await fetch(`${BASE}/version.json?t=${Date.now()}`);
      if (!r.ok) return;
      const v = (await r.json()) as Latest;
      if (v.sha && v.sha !== BUILD.sha && (!BUILD.builtAt || v.builtAt > BUILD.builtAt)) setLatest(v);
    } catch { /* offline — try again later */ }
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [check]);

  async function install() {
    if (!latest) return;
    setFailed(false);
    setProgress(0);
    try {
      const file = `${FileSystem.cacheDirectory}MaaCrave-${latest.sha.slice(0, 7)}.apk`;
      const dl = FileSystem.createDownloadResumable(latest.url, file, {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0) setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      });
      const res = await dl.downloadAsync();
      if (!res?.uri) throw new Error('download failed');
      const contentUri = await FileSystem.getContentUriAsync(res.uri);
      setProgress(null);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1, type: 'application/vnd.android.package-archive' });
    } catch {
      // Couldn't install from inside the app (e.g. permission refused): fall back to the browser download.
      setProgress(null);
      setFailed(true);
      Linking.openURL(latest.url).catch(() => undefined);
    }
  }

  const show = !!latest && dismissed !== latest.sha;
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={() => setDismissed(latest?.sha || null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,6,8,0.55)', justifyContent: 'flex-end', padding: S.lg }}>
        <View style={{ backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, gap: S.md, marginBottom: S.lg }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} color={C.brand} />
          </View>
          <T v="section">{t('A new update is ready', 'নতুন আপডেট এসেছে')}</T>
          <T v="sub">{latest?.notes?.[lang] || t('Improvements and fixes for MaaCrave.', 'MaaCrave-এ নতুন উন্নতি ও সংশোধন।')}</T>
          {progress != null ? (
            <View style={{ gap: 6 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: C.sunken, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(progress * 100)}%`, height: 8, backgroundColor: C.brand }} />
              </View>
              <T v="meta">{t(`Downloading… ${Math.round(progress * 100)}%`, `ডাউনলোড হচ্ছে… ${Math.round(progress * 100)}%`)}</T>
            </View>
          ) : (
            <>
              <T v="meta">{failed
                ? t('Opening the download in your browser — tap the file when it finishes, then Install.', 'ব্রাউজারে ডাউনলোড খুলছে — শেষ হলে ফাইলে চাপ দিয়ে Install করুন।')
                : t('Tap Update, then Install on the next screen. Your account and cart stay as they are.', 'Update চাপুন, তারপর পরের স্ক্রিনে Install। আপনার অ্যাকাউন্ট ও কার্ট যেমন আছে তেমনই থাকবে।')}</T>
              <Button full size="lg" title={t('Update now', 'এখনই আপডেট করুন')} icon={<Download size={18} color="#fff" />} onPress={install} />
              <Button full v="ghost" title={t('Later', 'পরে')} onPress={() => setDismissed(latest?.sha || null)} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
