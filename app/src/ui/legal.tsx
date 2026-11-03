import { router } from 'expo-router';
import { BadgeCheck, ChevronRight, FileText, Mail, ShieldCheck } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { num, setLang, useLang } from '../i18n';
import { type Bi, LEGAL_DOCS, type LegalDoc } from '../legal/content';
import { C, R, S } from '../theme';
import { Card, Header, Row, Screen, T, Tap } from './index';

const ROUTES: Record<string, string> = { terms: '/terms', privacy: '/privacy', refund: '/refund', 'cook-terms': '/cook-terms', 'rider-terms': '/rider-terms' };

/** One legal document, laid out for reading: summary card, key points, numbered sections, contact and related pages. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const lang = useLang();
  const pick = (b: Bi) => (lang === 'bn' ? b.bn : b.en);
  const related = Object.values(LEGAL_DOCS).filter((d) => d.key !== doc.key);
  return (
    <Screen header={<Header back title={pick(doc.title)} />}>
      <View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', gap: S.lg, marginTop: S.sm }}>
        {/* summary */}
        <View style={{ backgroundColor: C.brandSoft, borderRadius: R.xl, padding: S.xl, gap: S.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={8}><ShieldCheck size={18} color={C.brand} /><T v="eyebrow" color={C.brandText}>MaaCrave · {lang === 'bn' ? 'আইনি তথ্য' : 'Legal'}</T></Row>
            <Tap onPress={() => setLang(lang === 'bn' ? 'en' : 'bn')} scale={0.94} style={{ backgroundColor: '#fff', borderRadius: R.pill, paddingHorizontal: 12, height: 30, justifyContent: 'center' }}>
              <T v="label" color={C.brandText} bn={lang !== 'bn'}>{lang === 'bn' ? 'English' : 'বাংলা'}</T>
            </Tap>
          </Row>
          <T v="body" color={C.text}>{pick(doc.intro)}</T>
          <T v="meta">{lang === 'bn' ? `সর্বশেষ হালনাগাদ: ${doc.updated}` : `Last updated ${doc.updated}`}</T>
        </View>

        {/* the three things most people want to know */}
        <View style={{ gap: S.sm }}>
          {doc.highlights.map((h) => (
            <Row key={h.en} gap={10} style={{ backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, paddingHorizontal: S.lg, paddingVertical: 12 }}>
              <BadgeCheck size={18} color={C.ok} />
              <T v="label" style={{ flex: 1 }}>{pick(h)}</T>
            </Row>
          ))}
        </View>

        {/* numbered sections */}
        {doc.sections.map((s, i) => (
          <View key={s.h.en} style={{ flexDirection: 'row', gap: S.md }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <T v="label" color="#fff">{num(i + 1)}</T>
            </View>
            <View style={{ flex: 1, gap: 8, paddingBottom: S.md, borderBottomWidth: i < doc.sections.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
              <T v="card">{pick(s.h)}</T>
              <T v="body" color={C.text2}>{pick(s.p)}</T>
              {s.points?.map((p) => (
                <Row key={p.en} gap={10} style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.brand, marginTop: 8 }} />
                  <T v="body" color={C.text2} style={{ flex: 1 }}>{pick(p)}</T>
                </Row>
              ))}
            </View>
          </View>
        ))}

        {/* contact */}
        <Card style={{ gap: S.sm }}>
          <T v="card">{lang === 'bn' ? 'প্রশ্ন আছে?' : 'Questions?'}</T>
          <T v="sub">{lang === 'bn' ? 'অ্যাপের Help & support থেকে লিখুন, অথবা ইমেইল করুন।' : 'Write to us from Help & support in the app, or email us.'}</T>
          <Tap onPress={() => Linking.openURL('mailto:support@maacrave.app')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Mail size={16} color={C.brand} /><T v="label" color={C.brandText}>support@maacrave.app</T>
          </Tap>
        </Card>

        {/* other policies */}
        <View style={{ gap: S.sm, marginBottom: S.lg }}>
          <T v="eyebrow">{lang === 'bn' ? 'অন্যান্য নীতি' : 'Other policies'}</T>
          <Card white style={{ padding: 0 }}>
            {related.map((d, i) => (
              <Tap key={d.key} onPress={() => router.push(ROUTES[d.key] as never)} scale={0.99}
                style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <FileText size={17} color={C.brand} />
                <T v="body" style={{ flex: 1 }}>{pick(d.title)}</T>
                <ChevronRight size={17} color={C.muted} />
              </Tap>
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
