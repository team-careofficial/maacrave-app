import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Bike, ChefHat, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { useMeta } from '@/hooks';
import { C, CATEGORY_META, S } from '@/theme';
import { Button, Card, Chip, Field, Header, IconTile, Input, Note, Row, Screen, Stepper, T, useToast } from '@/ui';

const HOURS = ['7am – 11am', '11am – 3pm', '11am – 9pm', '5pm – 10pm'];

export default function Apply() {
  const { role } = useLocalSearchParams<{ role: 'cook' | 'rider' }>();
  const { me, reload } = useAuth();
  const meta = useMeta();
  const toast = useToast();
  const isCook = role === 'cook';
  const [displayName, setDisplayName] = useState(me?.name ? `${me.name.split(' ')[0]}’s Kitchen` : '');
  const [area, setArea] = useState(me?.area || '');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [kitchenInfo, setKitchenInfo] = useState('');
  const [hours, setHours] = useState(HOURS[2]);
  const [capacity, setCapacity] = useState(20);
  const [vehicle, setVehicle] = useState('Motorbike');
  const [nid, setNid] = useState('');
  const [agree, setAgree] = useState(false);

  const m = useMutation({
    mutationFn: () => (isCook
      ? API.applyCook({ displayName: displayName.trim(), area, specialties: specialties.map((s) => CATEGORY_META[s]?.label || s), experience: experience.trim() || undefined, kitchenInfo: kitchenInfo.trim() || undefined, hours, dailyCapacity: capacity, nidLast4: nid })
      : API.applyRider({ vehicle, nidLast4: nid })),
    onSuccess: async () => { await reload(); toast('Application sent'); router.replace('/account'); },
  });
  const ok = /^\d{4}$/.test(nid) && agree && (!isCook || (displayName.trim().length >= 2 && !!area && specialties.length > 0));

  return (
    <Screen header={<Header back title={isCook ? 'Cook with MaaCrave' : 'Ride with MaaCrave'} />}
      footer={<Button title="Submit application" size="lg" style={{ flex: 1 }} disabled={!ok} loading={m.isPending} onPress={() => m.mutate()} />}>
      <Row style={{ marginTop: S.sm, alignItems: 'flex-start' }}>
        <IconTile Icon={isCook ? ChefHat : Bike} size={48} />
        <View style={{ flex: 1 }}>
          <T v="title">{isCook ? 'Earn from your home kitchen' : 'Deliver home food, earn per drop'}</T>
          <T v="sub" style={{ marginTop: 4 }}>{isCook ? 'Set your own menu and hours. We bring the customers, riders and payments.' : 'Go online when it suits you. You earn for every delivery, paid weekly.'}</T>
        </View>
      </Row>

      <View style={{ gap: S.xl, marginTop: S.xl }}>
        {isCook ? (
          <>
            <Input label="Kitchen name" value={displayName} onChangeText={setDisplayName} placeholder="e.g. Rina’s Kitchen" maxLength={60} />
            <Field label="Area">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
                {(meta.data?.areas || []).map((a) => <Chip key={a} label={a} on={area === a} onPress={() => setArea(a)} />)}
              </ScrollView>
            </Field>
            <Field label="What do you cook best?">
              <Row gap={S.sm} wrap>{Object.entries(CATEGORY_META).map(([k, c]) => <Chip key={k} label={c.label} on={specialties.includes(k)} onPress={() => setSpecialties(specialties.includes(k) ? specialties.filter((x) => x !== k) : [...specialties, k])} />)}</Row>
            </Field>
            <Field label="Cooking hours"><Row gap={S.sm} wrap>{HOURS.map((h) => <Chip key={h} label={h} on={hours === h} onPress={() => setHours(h)} />)}</Row></Field>
            <Field label="Portions you can cook a day"><Row style={{ justifyContent: 'space-between' }}><T v="sub">{capacity} portions</T><Stepper value={capacity} onChange={setCapacity} min={5} max={200} large /></Row></Field>
            <Input label="Cooking experience" value={experience} onChangeText={setExperience} placeholder="e.g. 15 years cooking for family events" maxLength={200} />
            <Input label="About your kitchen" value={kitchenInfo} onChangeText={setKitchenInfo} placeholder="Gas stove, fridge, water filter…" maxLength={200} />
          </>
        ) : (
          <Field label="Vehicle"><Row gap={S.sm}>{['Motorbike', 'Bicycle', 'On foot'].map((v) => <Chip key={v} label={v} on={vehicle === v} onPress={() => setVehicle(v)} />)}</Row></Field>
        )}
        <Input label="Last 4 digits of your NID" value={nid} onChangeText={(t) => setNid(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="1234"
          hint="We match this with your NID during the verification call. We never store your full NID number in the app." />
        <Card style={{ gap: S.sm, backgroundColor: C.surface2, borderColor: C.surface2 }}>
          <Row gap={8}><ShieldCheck size={18} color={C.ok} /><T v="label">What happens next</T></Row>
          <T v="sub">{isCook ? 'Our team calls you within 2 working days, checks your NID and visits or video-checks your kitchen. Once approved, “Switch to Mother / Cook mode” appears in your account.' : 'Our team calls you within 2 working days to check your NID and licence. Once approved, “Switch to Rider mode” appears in your account.'}</T>
        </Card>
        <Chip label={agree ? '✓ I agree to the partner terms and food safety rules' : 'I agree to the partner terms and food safety rules'} on={agree} onPress={() => setAgree(!agree)} />
        {m.error ? <Note tone="err">{(m.error as Error).message}</Note> : null}
      </View>
    </Screen>
  );
}
