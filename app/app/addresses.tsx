import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MapPin, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { useAddresses, useMeta } from '@/hooks';
import { C, S } from '@/theme';
import { Badge, Button, Card, Chip, confirm, Empty, Field, Header, Input, Loading, Note, Row, Screen, T, useToast } from '@/ui';

function AddressForm({ onDone }: { onDone: () => void }) {
  const { me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const meta = useMeta();
  const [label, setLabel] = useState('Home');
  const [area, setArea] = useState(me?.area || '');
  const [road, setRoad] = useState('');
  const [house, setHouse] = useState('');
  const [floor, setFloor] = useState('');
  const [landmark, setLandmark] = useState('');
  const m = useMutation({
    mutationFn: () => API.addAddress({ label, area, road: road.trim(), house: house.trim(), floor: floor.trim() || null, landmark: landmark.trim() || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast('Address saved'); onDone(); },
  });
  const ok = !!area && road.trim().length >= 2 && house.trim().length >= 1;
  return (
    <Card style={{ gap: S.lg }}>
      <Field label="Save as"><Row gap={S.sm}>{['Home', 'Work', 'Other'].map((l) => <Chip key={l} label={l} on={label === l} onPress={() => setLabel(l)} />)}</Row></Field>
      <Field label="Area" hint="We deliver in these Dhaka areas for now.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {(meta.data?.areas || []).map((a) => <Chip key={a} label={a} on={area === a} onPress={() => setArea(a)} />)}
        </ScrollView>
      </Field>
      <Input label="Road / block" value={road} onChangeText={setRoad} placeholder="Road 7, Block C" maxLength={120} />
      <Row gap={S.md}>
        <View style={{ flex: 1 }}><Input label="House" value={house} onChangeText={setHouse} placeholder="12/A" maxLength={120} /></View>
        <View style={{ flex: 1 }}><Input label="Floor / flat" value={floor} onChangeText={setFloor} placeholder="4B (optional)" maxLength={60} /></View>
      </Row>
      <Input label="Landmark" value={landmark} onChangeText={setLandmark} placeholder="Near the mosque (optional)" maxLength={120} />
      {m.error ? <Note tone="err">{(m.error as Error).message}</Note> : null}
      <Row gap={S.sm}>
        <Button title="Save address" disabled={!ok} loading={m.isPending} onPress={() => m.mutate()} />
        <Button title="Cancel" v="ghost" onPress={onDone} />
      </Row>
    </Card>
  );
}

export default function Addresses() {
  const q = useAddresses();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const setDefault = useMutation({ mutationFn: API.setDefaultAddress, onSuccess: (d) => qc.setQueryData(['addresses'], d) });
  const remove = useMutation({ mutationFn: API.deleteAddress, onSuccess: (d) => qc.setQueryData(['addresses'], d) });
  const showForm = adding || (q.data && !q.data.length);
  return (
    <Screen header={<Header back title="Delivery addresses" right={!showForm ? <Button title="Add" size="sm" v="secondary" icon={<Plus size={16} color={C.brandText} />} onPress={() => setAdding(true)} /> : undefined} />}>
      {q.isLoading ? <Loading /> : (
        <View style={{ gap: S.md, marginTop: S.sm }}>
          {showForm ? <AddressForm onDone={() => { setAdding(false); if (router.canGoBack() && !q.data?.length) router.back(); }} /> : null}
          {q.data?.map((a) => (
            <Card key={a.id} style={{ gap: S.sm }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <MapPin size={20} color={a.isDefault ? C.brand : C.muted} />
                <View style={{ flex: 1 }}>
                  <Row gap={8}><T v="card">{a.label}</T>{a.isDefault ? <Badge label="Default" tone="brand" /> : null}</Row>
                  <T v="sub">{[`House ${a.house}`, a.road, a.floor, a.area].filter(Boolean).join(', ')}</T>
                  {a.landmark ? <T v="meta">{a.landmark}</T> : null}
                </View>
                <Pressable accessibilityLabel="Delete address" hitSlop={10} onPress={async () => { if (await confirm('Delete address?', `${a.label} · ${a.area}`, 'Delete', true)) remove.mutate(a.id); }}><Trash2 size={18} color={C.muted} /></Pressable>
              </Row>
              {!a.isDefault ? <Button title="Make default" v="ghost" size="sm" onPress={() => setDefault.mutate(a.id)} style={{ alignSelf: 'flex-start' }} /> : null}
            </Card>
          ))}
          {!q.data?.length && !showForm ? <Empty Icon={MapPin} title="No addresses yet" text="Add where we should bring your food." /> : null}
        </View>
      )}
    </Screen>
  );
}
