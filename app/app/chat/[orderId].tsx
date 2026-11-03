import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Lock, Send } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { ago } from '@/format';
import { t } from '@/i18n';
import { C, R, S } from '@/theme';
import { Button, ErrorState, Footer, Header, Input, Loading, Row, Screen, T, useToast } from '@/ui';

const WHO = { CUSTOMER: ['Customer', 'কাস্টমার'], COOK: ['Mother (cook)', 'মা (রাঁধুনি)'], RIDER: ['Rider', 'রাইডার'] } as const;
const QUICK: Record<'CUSTOMER' | 'COOK' | 'RIDER', [string, string][]> = {
  CUSTOMER: [['Please make it less spicy', 'ঝাল একটু কম দেবেন'], ['Less oil, please', 'তেল কম দেবেন'], ['I have an allergy, please be careful', 'আমার অ্যালার্জি আছে, একটু খেয়াল রাখবেন']],
  COOK: [['Started cooking', 'রান্না শুরু করেছি'], ['Food will be ready in 15 minutes', '১৫ মিনিটে খাবার তৈরি হবে'], ['Noted, I’ll keep that in mind', 'ঠিক আছে, খেয়াল রাখব']],
  RIDER: [['On my way to the kitchen', 'রান্নাঘরের দিকে যাচ্ছি'], ['Food picked up, coming to you', 'খাবার নিয়েছি, আসছি'], ['I’m at your gate', 'আপনার গেটে আছি']],
};

/** Order chat between the customer, the mother and the rider. Phone numbers are hidden by MaaCrave. */
export default function OrderChatScreen() {
  const { orderId, code } = useLocalSearchParams<{ orderId: string; code?: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['chat', orderId], queryFn: () => API.messages(orderId), refetchInterval: 8_000 });
  const send = useMutation({ mutationFn: (body: string) => API.sendMessage(orderId, body), onSuccess: (d) => { qc.setQueryData(['chat', orderId], d); setMsg(''); }, onError: (e: Error) => toast(e.message) });
  const c = q.data;
  return (
    <Screen header={<Header back title={t('Order chat', 'অর্ডার চ্যাট')} sub={code ? `${code}` : undefined} />} onRefresh={q.refetch} refreshing={q.isRefetching}
      footer={c?.open ? (
        <Footer>
          <View style={{ gap: S.sm, flex: 1 }}>
            <Row gap={6} wrap>{QUICK[c.me].map(([en, bn]) => <Button key={en} title={t(en, bn)} size="sm" v="outline" onPress={() => send.mutate(t(en, bn))} />)}</Row>
            <Row gap={S.sm} style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Input value={msg} onChangeText={setMsg} placeholder={t('Write a message…', 'বার্তা লিখুন…')} maxLength={600} multiline /></View>
              <Button title={t('Send', 'পাঠান')} icon={<Send size={15} color="#fff" />} disabled={!msg.trim()} loading={send.isPending} onPress={() => send.mutate(msg.trim())} />
            </Row>
          </View>
        </Footer>
      ) : undefined}>
      {q.isLoading ? <Loading /> : q.error || !c ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <View style={{ gap: S.sm, marginTop: S.sm, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
          <Row gap={8} style={{ backgroundColor: C.surface2, borderRadius: R.md, padding: S.md }}>
            <Lock size={15} color={C.muted} />
            <T v="meta" style={{ flex: 1 }}>{t('Talk about this order only. Phone numbers are hidden to keep everyone safe. Changes after cooking starts depend on the mother.', 'শুধু এই অর্ডার নিয়ে কথা বলুন। সবার নিরাপত্তার জন্য ফোন নম্বর লুকানো থাকে। রান্না শুরুর পর কোনো পরিবর্তন মায়ের সিদ্ধান্তে।')}</T>
          </Row>
          {c.messages.length ? c.messages.map((m) => (
            <View key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '86%', gap: 4 }}>
              <View style={{ backgroundColor: m.mine ? C.brandSoft : C.surface, borderWidth: m.mine ? 0 : 1, borderColor: C.line, borderRadius: R.lg, borderTopRightRadius: m.mine ? 4 : R.lg, borderTopLeftRadius: m.mine ? R.lg : 4, paddingHorizontal: 14, paddingVertical: 10 }}>
                <T v="body" color={m.mine ? C.brandDark : C.text}>{m.body}</T>
              </View>
              <T v="meta" style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start' }}>{m.mine ? t('You', 'আপনি') : t(WHO[m.role][0], WHO[m.role][1])} · {ago(m.createdAt)}</T>
            </View>
          )) : <T v="sub" center style={{ marginTop: S.xl }}>{t('No messages yet. Ask the mother anything about this order.', 'এখনো কোনো বার্তা নেই। এই অর্ডার নিয়ে যা জানার জিজ্ঞেস করুন।')}</T>}
          {!c.open ? <T v="meta" center style={{ marginTop: S.md }}>{t('This chat is closed. For anything else, use Help & support.', 'এই চ্যাট বন্ধ। অন্য কিছুর জন্য Help & support ব্যবহার করুন।')}</T> : null}
        </View>
      )}
    </Screen>
  );
}
