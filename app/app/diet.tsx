import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, HeartPulse, ShieldAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { t, useLang } from '@/i18n';
import { ALLERGY, HEALTH } from '@/maa';
import { C, F, R, S } from '@/theme';
import { Button, Header, Note, Row, Screen, Section, T, Tap, useToast } from '@/ui';
import { Stitch } from '@/ui/maa';

/** "আমার খাদ্যাভ্যাস": what to show first, and which allergens to warn about on every dish. */
export default function Diet() {
  const lang = useLang();
  const { me, reload } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  useEffect(() => { setPrefs(me?.dietPrefs || []); setAllergies(me?.allergies || []); }, [me?.dietPrefs, me?.allergies]);
  const toggle = (list: string[], set: (v: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);
  const save = useMutation({
    mutationFn: () => API.updateMe({ dietPrefs: prefs, allergies }),
    onSuccess: async () => { await reload(); toast(t('Saved. We’ll warn you on dishes with these allergens.', 'সেভ হয়েছে। এসব উপাদান থাকলে আমরা জানিয়ে দেব।')); router.back(); },
  });

  return (
    <Screen header={<Header back title={t('My food preferences', 'আমার খাদ্যাভ্যাস')} sub={t('Like a mother who knows what suits you', 'মায়ের মতো, যিনি জানেন কী আপনার জন্য ভালো')} />}
      footer={<Button title={t('Save', 'সেভ করুন')} size="lg" style={{ flex: 1 }} loading={save.isPending} onPress={() => save.mutate()} />}>
      <View style={{ maxWidth: 640, gap: S.sm }}>
        <Section title={t('What do you look for?', 'কেমন খাবার খুঁজছেন?')} sub={t('These show first on Home.', 'এগুলো Home-এ আগে দেখাবে।')} style={{ marginTop: S.sm }}>
          <View style={{ gap: S.sm }}>
            {Object.entries(HEALTH).map(([k, h]) => {
              const on = prefs.includes(k);
              return (
                <Tap key={k} role="switch" onPress={() => toggle(prefs, setPrefs, k)} scale={0.985}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.lg, borderWidth: 1.5, borderColor: on ? h.color : C.line2, backgroundColor: on ? h.color + '10' : C.surface }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: h.color + '1A', alignItems: 'center', justifyContent: 'center' }}><HeartPulse size={18} color={h.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bnBold, fontSize: 15.5, color: C.text }}>{h.bn}</Text>
                    {lang !== 'bn' ? <T v="meta">{h.en}</T> : null}
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? h.color : C.line2, backgroundColor: on ? h.color : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
                </Tap>
              );
            })}
          </View>
        </Section>

        <Stitch style={{ marginTop: S.xl }} />

        <Section title={t('Allergies', 'অ্যালার্জি')} sub={t('Dishes containing these get a red warning.', 'এগুলো থাকলে খাবারে লাল সতর্কবার্তা দেখাবে।')}>
          <Row gap={S.sm} wrap>
            {Object.entries(ALLERGY).map(([k, bn]) => {
              const on = allergies.includes(k);
              return (
                <Tap key={k} role="switch" onPress={() => toggle(allergies, setAllergies, k)} scale={0.95}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: on ? C.err : C.surface2 }}>
                  {on ? <ShieldAlert size={14} color="#fff" /> : null}
                  <Text style={{ fontFamily: lang === 'bn' ? F.bnBold : F.semibold, fontSize: 13.5, color: on ? '#fff' : C.text2 }}>{lang === 'bn' ? bn : k}</Text>
                </Tap>
              );
            })}
          </Row>
        </Section>
        <View style={{ marginTop: S.lg }}>
          <Note>{t('Cooks mark allergens on every dish, but home kitchens share pots and spices. For a serious allergy, also write it in the order note so the mother knows.', 'মায়েরা প্রতিটি খাবারে অ্যালার্জেন জানান, তবে ঘরের রান্নাঘরে হাঁড়ি-মশলা একসাথে ব্যবহার হয়। গুরুতর অ্যালার্জি থাকলে অর্ডারের নোটেও লিখে দিন।')}</Note>
        </View>
        {save.error ? <Note tone="err">{(save.error as Error).message}</Note> : null}
      </View>
    </Screen>
  );
}
