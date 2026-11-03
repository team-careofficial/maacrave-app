import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, FileText, LifeBuoy, Shield, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { C, R, S } from '@/theme';
import { Button, Card, Chip, confirm, ErrorState, Field, Header, Input, Loading, Row, Screen, Section, Stepper, T, useToast } from '@/ui';
import { ModeSwitch } from '@/ui/mode';
import { PinPicker } from '@/ui/map';
import { AREA_COORDS, DHAKA, type Point } from '@/geo';
import { num, t, useLang } from '@/i18n';
import { REGIONS } from '@/maa';
import { MotherPhoto } from '@/ui/maa';
import { MediaSlot } from '@/ui/photo';

const CHECKS = ['Clean cooking area and utensils', 'Safe drinking water for cooking', 'Fridge for raw meat and fish', 'Hair covered and hands washed while cooking', 'Food packed in sealed, food-grade boxes'];

export default function KitchenSettings() {
  const { canUse, signOut } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['kitchen'], queryFn: API.kitchen });
  const k = q.data?.kitchen;
  const [intro, setIntro] = useState('');
  const [hours, setHours] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [wallet, setWallet] = useState('');
  const [checks, setChecks] = useState(0);
  const [pin, setPin] = useState<Point | null>(null);
  const lang = useLang();
  const [story, setStory] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  useEffect(() => { if (k) { setIntro(k.intro || ''); setHours(k.hours || ''); setCapacity(k.dailyCapacity); setWallet(k.payoutWallet || ''); setChecks(k.hygieneChecks); setStory(k.story || ''); setRegion(k.region || null); } }, [k]);
  const leave = useMutation({
    mutationFn: (until: string) => API.updateKitchen({ awayUntil: until }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen'] }); toast(t('Saved', 'সেভ হয়েছে')); }, onError: (e) => toast((e as Error).message),
  });
  // Photos save the moment they're uploaded, so a picture is never lost.
  const savePhoto = useMutation({
    mutationFn: (b: { portraitId?: string; kitchenPhotoId?: string }) => API.updateKitchen(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen'] }); qc.invalidateQueries({ queryKey: ['me'] }); toast(t('Photo saved', 'ছবি সেভ হয়েছে')); }, onError: (e) => toast((e as Error).message),
  });
  const save = useMutation({
    mutationFn: () => API.updateKitchen({ intro: intro.trim(), story: story.trim(), region: region || '', hours: hours.trim(), dailyCapacity: capacity, payoutWallet: wallet.trim() || undefined, hygieneChecks: checks, ...(pin ? { lat: pin.lat, lng: pin.lng } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kitchen'] }); toast('Kitchen saved'); }, onError: (e) => toast((e as Error).message),
  });

  return (
    <Screen header={<Header title="Kitchen" right={k ? <Button title="Save changes" size="sm" loading={save.isPending} onPress={() => save.mutate()} /> : undefined} />}>
      {q.isLoading ? <Loading /> : q.error || !k ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <>
          <Card white style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm }}>
            <MotherPhoto c={k} size={52} />
            <View style={{ flex: 1 }}><T v="card">{k.displayName}</T><T v="meta">{k.area} · {k.completedOrders} orders · {k.rating ? `${k.rating.toFixed(1)}★` : 'New'}</T></View>
            <Button title="View" size="sm" v="ghost" onPress={() => router.push(`/cook/${k.id}`)} />
          </Card>

          <Section title={t('Your story', 'আপনার গল্প')} sub={t('Customers choose a mother, not a restaurant. Let them meet you.', 'মানুষ রেস্টুরেন্ট না, একজন মাকে বেছে নেন। তাঁদের সাথে পরিচয় করিয়ে দিন।')}>
            <View style={{ gap: S.lg }}>
              <Row gap={S.lg} style={{ alignItems: 'flex-start' }}>
                <MediaSlot kind="PORTRAIT" round value={k.portraitId} onChange={(id) => savePhoto.mutate({ portraitId: id || '' })} label={t('Your photo', 'আপনার ছবি')} hint={t('Smiling, face clear', 'হাসিমুখে, মুখ পরিষ্কার')} />
                <View style={{ flex: 1 }}>
                  <MediaSlot kind="KITCHEN" value={k.kitchenPhotoId} onChange={(id) => savePhoto.mutate({ kitchenPhotoId: id || '' })} label={t('Your kitchen', 'আপনার রান্নাঘর')} hint={t('Clean and bright: builds trust', 'পরিষ্কার ও আলোকিত: বিশ্বাস বাড়ায়')} />
                </View>
              </Row>
              <Input label={t('In your own words', 'নিজের ভাষায়')} value={story} onChangeText={setStory} maxLength={600} multiline
                placeholder={t('e.g. I’ve cooked for my family for 30 years. My shorshe ilish is what my children miss most…', 'যেমন: ৩০ বছর ধরে পরিবারের জন্য রান্না করছি। আমার সর্ষে ইলিশ আমার ছেলেমেয়েরা সবচেয়ে বেশি মিস করে…')} style={{ minHeight: 110, alignItems: 'flex-start', paddingVertical: 12 }} />
              <Field label={t('Your home district', 'আপনার জেলা')}>
                <Row gap={S.sm} wrap>{Object.entries(REGIONS).map(([key, r]) => <Chip key={key} label={lang === 'bn' ? r.bn : r.en} on={region === key} onPress={() => setRegion(region === key ? null : key)} />)}</Row>
                <T v="meta" style={{ marginTop: 6 }}>{t('Your dishes show under “A taste of home” for that district.', 'আপনার পদগুলো সেই জেলার “নিজের জেলার স্বাদ”-এ দেখাবে।')}</T>
              </Field>
            </View>
          </Section>

          <Section title="Profile">
            <View style={{ gap: S.lg }}>
              <Input label="About your kitchen" value={intro} onChangeText={setIntro} maxLength={300} multiline placeholder="Tell customers what makes your cooking special" style={{ minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 }} />
              <Input label="Cooking hours" value={hours} onChangeText={setHours} maxLength={30} placeholder="11am – 9pm" />
              <Field label="Portions you can cook a day"><Row style={{ justifyContent: 'space-between' }}><T v="sub">{capacity} portions</T><Stepper value={capacity} onChange={setCapacity} min={1} max={300} large /></Row></Field>
            </View>
          </Section>

          <Section title="Kitchen location" sub="Customers see the route from here when they order. Drag the map to put the pin on your kitchen.">
            <PinPicker center={k.lat != null && k.lng != null ? { lat: k.lat, lng: k.lng } : AREA_COORDS[k.area] || DHAKA} onChange={setPin} />
          </Section>

          <Section title={t('Leave', 'ছুটি')} sub={t('Going away? Customers see when you’re back, and no orders come in until then.', 'কোথাও যাচ্ছেন? কাস্টমাররা দেখবেন কবে ফিরবেন, ততদিন অর্ডার আসবে না।')}>
            <Row gap={S.sm} wrap>
              {[1, 3, 7, 14].map((d) => <Chip key={d} label={t(`${d} day${d > 1 ? 's' : ''}`, `${num(d)} দিন`)} onPress={() => leave.mutate(new Date(Date.now() + d * 86400_000).toISOString())} />)}
              {k.awayUntil && new Date(k.awayUntil) > new Date() ? <Chip on label={t('I’m back', 'ফিরে এসেছি')} onPress={() => leave.mutate('')} /> : null}
            </Row>
            {k.awayUntil && new Date(k.awayUntil) > new Date() ? <T v="meta" style={{ marginTop: 6 }}>{t(`On leave until ${new Date(k.awayUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`, `${new Date(k.awayUntil).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' })} পর্যন্ত ছুটিতে`)}</T> : null}
          </Section>

          <Section title="Hygiene checklist" sub={`${checks} of 5 — shown to customers as a trust badge`}>
            <View style={{ gap: S.sm }}>
              {CHECKS.map((c, i) => {
                const on = i < checks;
                return (
                  <Pressable key={c} onPress={() => setChecks(on ? i : i + 1)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: on ? C.ok + '55' : C.line2, backgroundColor: on ? C.okSoft : C.surface }}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: on ? C.ok : C.surface, borderWidth: on ? 0 : 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
                    <T v="sub" color={C.text} style={{ flex: 1 }}>{c}</T>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Payouts">
            <Input label="bKash number for payouts" value={wallet} onChangeText={(t) => setWallet(t.replace(/[^\d]/g, '').slice(0, 11))} keyboardType="phone-pad" placeholder="01XXXXXXXXX" />
            <Button title="Earnings & withdrawals" v="outline" icon={<Wallet size={16} color={C.text} />} onPress={() => router.push('/kitchen/earnings')} style={{ alignSelf: 'flex-start' }} />
          </Section>

          <Button title="Save changes" size="lg" loading={save.isPending} onPress={() => save.mutate()} style={{ marginTop: S.xl }} />

          <Section title="Help & policies">
            <Row gap={S.sm} wrap>
              <Button title="Rates & terms" v="outline" icon={<Wallet size={16} color={C.text} />} onPress={() => router.push('/partner/cook')} />
              <Button title="Help & support" v="outline" icon={<LifeBuoy size={16} color={C.text} />} onPress={() => router.push('/support')} />
              <Button title="Cook terms" v="ghost" icon={<FileText size={16} color={C.text} />} onPress={() => router.push('/cook-terms')} />
              <Button title="Privacy" v="ghost" icon={<Shield size={16} color={C.text} />} onPress={() => router.push('/privacy')} />
            </Row>
          </Section>

          <Section title="Account">
            <Row gap={S.sm} wrap>
              <ModeSwitch to="CUSTOMER" />
              {canUse('RIDER') ? <ModeSwitch to="RIDER" /> : null}
              <Button title="Sign out" v="danger" onPress={async () => { if (await confirm('Sign out?', 'You can sign back in with your phone number.', 'Sign out', true)) signOut(); }} />
            </Row>
          </Section>
        </>
      )}
    </Screen>
  );
}
