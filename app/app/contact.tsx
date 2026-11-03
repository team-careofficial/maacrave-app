import { View } from 'react-native';
import { useAuth } from '@/auth';
import { S } from '@/theme';
import { Header, Note, Screen, Section } from '@/ui';
import { ContactVerify } from '@/ui/contactVerify';

/** Change or add the account's mobile number and email. Each change is confirmed with a code. */
export default function Contact() {
  const { me } = useAuth();
  return (
    <Screen header={<Header back title="Phone & email" sub="Changes are confirmed with a 6-digit code" />}>
      <View style={{ maxWidth: 560, gap: S.sm }}>
        <Section title="Mobile number" style={{ marginTop: S.sm }}>
          <ContactVerify kind="phone" current={me?.phone} verified={!!me?.phoneVerifiedAt} />
        </Section>
        <Section title="Email">
          <ContactVerify kind="email" current={me?.email} />
        </Section>
        <View style={{ marginTop: S.lg }}><Note>You can sign in with either one. Riders see your number only while delivering your order.</Note></View>
      </View>
    </Screen>
  );
}
