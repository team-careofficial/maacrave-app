import { View } from 'react-native';
import { useAuth } from '@/auth';
import { S } from '@/theme';
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
