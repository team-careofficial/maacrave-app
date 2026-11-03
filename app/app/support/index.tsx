import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, LifeBuoy, Mail, MessageCircle, Phone, Plus } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { API } from '@/api';
import { ago } from '@/format';
import { t, useLang } from '@/i18n';
import { C, R, S } from '@/theme';
import { TICKET_LABEL, TICKET_TONE } from '@/support';
import { Badge, Button, Card, Empty, ErrorState, Header, Loading, Row, Screen, Section, T, Tap } from '@/ui';

export default function Support() {
  useLang();
  const contact = useQuery({ queryKey: ['support-contact'], queryFn: API.supportContact, staleTime: 3600_000 });
  const list = useQuery({ queryKey: ['tickets'], queryFn: API.tickets });
  const c = contact.data;
  return (
    <Screen header={<Header back title="Help & support" sub="We usually reply within a few hours" />} onRefresh={list.refetch} refreshing={list.isRefetching}>
      <View style={{ backgroundColor: C.brandSoft, borderRadius: R.xl, padding: S.xl, gap: S.md, marginTop: S.sm }}>
        <Row gap={S.md}><LifeBuoy size={22} color={C.brand} /><T v="card" style={{ flex: 1 }}>How can we help?</T></Row>
        <T v="sub" color={C.brandText}>{t('For a problem with food you received, use “Report a problem” on that order — it’s the fastest way to a refund.', 'পাওয়া খাবারে সমস্যা হলে সেই অর্ডারের “Report a problem” ব্যবহার করুন — রিফান্ডের সবচেয়ে দ্রুত উপায়।')}</T>
        <Row gap={S.sm} wrap>
          <Button title="Write to us" icon={<MessageCircle size={16} color="#fff" />} onPress={() => router.push('/support/new')} />
          {c?.phone ? <Button title="Call" v="light" icon={<Phone size={16} color={C.text} />} onPress={() => Linking.openURL(`tel:${c.phone}`)} /> : null}
          <Button title="Email" v="light" icon={<Mail size={16} color={C.text} />} onPress={() => Linking.openURL(`mailto:${c?.email || 'support@maacrave.app'}`)} />
        </Row>
        {c ? <T v="meta" color={C.brandText}>{t(`Support hours: ${c.hours}`, `সাপোর্টের সময়: সকাল ৯টা – রাত ১১টা, প্রতিদিন`)}</T> : null}
      </View>

      <Section title="Your requests" action="New" onAction={() => router.push('/support/new')}>
        {list.isLoading ? <Loading /> : list.error ? <ErrorState error={list.error} onRetry={list.refetch} /> : !list.data?.length ? (
          <Empty Icon={MessageCircle} title="No requests yet" text="When you write to us, the conversation shows up here." action="Write to us" onAction={() => router.push('/support/new')} />
        ) : (
          <Card white style={{ padding: 0 }}>
            {list.data.map((tk, i) => (
              <Tap key={tk.id} onPress={() => router.push(`/support/${tk.id}`)} scale={0.99}
                style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="label" numberOfLines={1}>{tk.subject}</T>
                  <T v="meta" numberOfLines={1}>{tk.messages[0]?.fromAdmin ? t('MaaCrave: ', 'MaaCrave: ') : ''}{tk.messages[0]?.body || ''}</T>
                  <T v="meta">{ago(tk.updatedAt)}</T>
                </View>
                <Badge label={TICKET_LABEL[tk.status]} tone={TICKET_TONE[tk.status]} />
                <ChevronRight size={16} color={C.muted} />
              </Tap>
            ))}
          </Card>
        )}
      </Section>
      <View style={{ marginTop: S.lg }}><Button title="Start a new request" v="ghost" icon={<Plus size={16} color={C.text} />} onPress={() => router.push('/support/new')} /></View>
    </Screen>
  );
}
