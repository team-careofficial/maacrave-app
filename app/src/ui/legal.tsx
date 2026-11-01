import { View } from 'react-native';
import { C, S } from '../theme';
import { Header, Screen, T } from './index';

/** Simple readable legal page. Have the text reviewed by a lawyer before public launch. */
export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { h: string; p: string }[] }) {
  return (
    <Screen header={<Header back title={title} />}>
      <View style={{ maxWidth: 720, gap: S.lg, marginTop: S.sm }}>
        <T v="meta">Last updated {updated}</T>
        {sections.map((s) => (
          <View key={s.h} style={{ gap: 6 }}>
            <T v="card">{s.h}</T>
            <T v="body" color={C.text2}>{s.p}</T>
          </View>
        ))}
        <T v="sub">Questions? Email support@maacrave.app.</T>
      </View>
    </Screen>
  );
}
