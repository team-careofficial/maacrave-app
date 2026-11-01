import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Bike, ChefHat, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { API, type UploadDoc } from '@/api';
import { useAuth } from '@/auth';
import { useMeta } from '@/hooks';
import { C, CATEGORY_META, S } from '@/theme';
import { Button, Card, Chip, Field, Header, IconTile, Input, Note, Row, Screen, Stepper, T, useToast } from '@/ui';
import { PhotoRow, PhotoSlot } from '@/ui/photo';

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
  const [nidFront, setNidFront] = useState<string | null>(null);
  const [nidBack, setNidBack] = useState<string | null>(null);
  const [kitchen, setKitchen] = useState<(string | null)[]>([null, null, null]);
  const [license, setLicense] = useState<string | null>(null);
  const previous = me?.roles.find((r) => r.role === (isCook ? 'COOK' : 'RIDER'));

  const docs = (): UploadDoc[] => [
    ...(nidFront ? [{ kind: 'NID_FRONT' as const, data: nidFront }] : []),
    ...(nidBack ? [{ kind: 'NID_BACK' as const, data: nidBack }] : []),
    ...(isCook ? kitchen.filter(Boolean).map((k) => ({ kind: 'KITCHEN' as const, data: k! })) : []),
    ...(!isCook && license ? [{ kind: 'LICENSE' as const, data: license }] : []),
  ];
  const photosOk = !!nidFront && (isCook ? kitchen.some(Boolean) : vehicle !== 'Motorbike' || !!license);

  const m = useMutation({
    mutationFn: () => (isCook
      ? API.applyCook({ displayName: displayName.trim(), area, specialties: specialties.map((s) => CATEGORY_META[s]?.label || s), experience: experience.trim() || undefined, kitchenInfo: kitchenInfo.trim() || undefined, hours, dailyCapacity: capacity, nidLast4: nid, documents: docs() })
      : API.applyRider({ vehicle, nidLast4: nid, documents: docs() })),
    onSuccess: async () => { await reload(); toast('Application sent — we’ll notify you after review'); router.replace('/'); },
  });
  const ok = /^\d{4}$/.test(nid) && agree && photosOk && (!isCook || (displayName.trim().length >= 2 && !!area && specialties.length > 0));

  return (
    <Screen header={<Header back title={isCook ? 'Cook with MaaCrave' : 'Ride with MaaCrave'} />}
      footer={previous?.status === 'PENDING' || previous?.status === 'APPROVED' ? undefined : <Button title={previous?.status === 'REJECTED' ? 'Resubmit application' : 'Submit application'} size="lg" style={{ flex: 1 }} disabled={!ok} loading={m.isPending} onPress={() => m.mutate()} />}>
      <Row style={{ marginTop: S.sm, alignItems: 'flex-start' }}>
        <IconTile Icon={isCook ? ChefHat : Bike} size={48} />
        <View style={{ flex: 1 }}>
          <T v="title">{isCook ? 'Earn from your home kitchen' : 'Deliver home food, earn per drop'}</T>
          <T v="sub" style={{ marginTop: 4 }}>{isCook ? 'Set your own menu and hours. We bring the customers, riders and payments.' : 'Go online when it suits you. You earn for every delivery, paid weekly.'}</T>
        </View>
      </Row>

      {previous?.status === 'REJECTED' ? (
        <View style={{ marginTop: S.lg }}><Note tone="warn">{`Our team asked for changes${previous.note ? `: “${previous.note}”` : '.'} Update your details below and submit again.`}</Note></View>
      ) : null}
      {previous?.status === 'PENDING' || previous?.status === 'APPROVED' ? (
        <View style={{ marginTop: S.xl }}>
          <Note tone={previous.status === 'APPROVED' ? 'ok' : 'brand'}>{previous.status === 'APPROVED' ? 'You’re approved. Switch modes from Account.' : 'Your application is under review. We’ll notify you as soon as our team has checked it — usually within 2 working days.'}</Note>
          <Button title="Back to account" v="outline" onPress={() => router.replace('/account')} style={{ marginTop: S.lg, alignSelf: 'flex-start' }} />
        </View>
      ) : (
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
          hint="Used to match your NID during the verification call." />
        <Field label="Verification photos" hint={isCook ? 'Clear photos of your NID and where you cook. Only the MaaCrave verification team can see them.' : 'Clear photos of your NID and driving licence. Only the MaaCrave verification team can see them.'}>
          <PhotoRow>
            <PhotoSlot label="NID front" value={nidFront} onChange={setNidFront} required />
            <PhotoSlot label="NID back" value={nidBack} onChange={setNidBack} />
            {isCook
              ? kitchen.map((k, i) => <PhotoSlot key={i} label={`Kitchen photo ${i + 1}`} value={k} required={i === 0} onChange={(v) => setKitchen(kitchen.map((x, j) => (j === i ? v : x)))} />)
              : <PhotoSlot label="Driving licence" value={license} onChange={setLicense} required={vehicle === 'Motorbike'} />}
          </PhotoRow>
        </Field>
        <Card style={{ gap: S.sm, backgroundColor: C.surface2, borderColor: C.surface2 }}>
          <Row gap={8}><ShieldCheck size={18} color={C.ok} /><T v="label">What happens next</T></Row>
          <T v="sub">{isCook ? 'Our team checks your NID and kitchen photos, may call you, and approves you within 2 working days. You can order food meanwhile. Once approved, “Switch to Mother / Cook mode” appears in Account.' : 'Our team checks your NID and licence, may call you, and approves you within 2 working days. Once approved, “Switch to Rider mode” appears in Account.'}</T>
        </Card>
        <Chip label={agree ? '✓ I agree to the partner terms and food safety rules' : 'I agree to the partner terms and food safety rules'} on={agree} onPress={() => setAgree(!agree)} />
        {m.error ? <Note tone="err">{(m.error as Error).message}</Note> : null}
      </View>
      )}
    </Screen>
  );
}
