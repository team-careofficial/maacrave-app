import { router } from 'expo-router';
import { FileText, LifeBuoy, Shield, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { useAuth } from '@/auth';
import { C, S } from '@/theme';
import { Avatar, Button, Card, confirm, Header, KV, Row, Screen, Section, T } from '@/ui';
import { ModeSwitch } from '@/ui/mode';

export default function RiderAccount() {
  const { me, canUse, signOut } = useAuth();
  if (!me) return null;
  return (
    <Screen header={<Header title="Account" />}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm }}>
        <Avatar name={me.name || 'Rider'} size={52} />
        <View style={{ flex: 1 }}><T v="card">{me.name}</T><T v="meta">{me.phone || me.email}</T></View>
      </Card>
      <Section title="Rider profile">
        <Card style={{ gap: S.sm }}>
          <KV k="Vehicle" v={me.rider?.vehicle || '—'} />
          <KV k="Status" v={me.rider?.online ? 'Online' : 'Offline'} />
        </Card>
      </Section>
      <Section title="Help & policies">
        <Row gap={S.sm} wrap>
          <Button title="Rates & terms" v="outline" icon={<Wallet size={16} color={C.text} />} onPress={() => router.push('/partner/rider')} />
          <Button title="Help & support" v="outline" icon={<LifeBuoy size={16} color={C.text} />} onPress={() => router.push('/support')} />
          <Button title="Rider terms" v="ghost" icon={<FileText size={16} color={C.text} />} onPress={() => router.push('/rider-terms')} />
          <Button title="Privacy" v="ghost" icon={<Shield size={16} color={C.text} />} onPress={() => router.push('/privacy')} />
        </Row>
      </Section>
      <Section title="Account">
        <Row gap={S.sm} wrap>
          <ModeSwitch to="CUSTOMER" />
          {canUse('COOK') ? <ModeSwitch to="COOK" /> : null}
          <Button title="Sign out" v="danger" onPress={async () => { if (await confirm('Sign out?', 'Go offline first so you don’t miss pickups.', 'Sign out', true)) signOut(); }} />
        </Row>
      </Section>
    </Screen>
  );
}
