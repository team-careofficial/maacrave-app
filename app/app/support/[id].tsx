import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { ago } from '@/format';
import { t } from '@/i18n';
import { C, R, S } from '@/theme';
import { Badge, Button, confirm, ErrorState, Footer, Header, Input, Loading, Row, Screen, T, useToast } from '@/ui';
import { TICKET_LABEL, TICKET_TONE } from '@/support';

export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['ticket', id], queryFn: () => API.ticket(id), refetchInterval: 30_000 });
  const reply = useMutation({ mutationFn: () => API.replyTicket(id, msg.trim()), onSuccess: (d) => { qc.setQueryData(['ticket', id], d); qc.invalidateQueries({ queryKey: ['tickets'] }); setMsg(''); }, onError: (e: Error) => toast(e.message) });
  const close = useMutation({ mutationFn: () => API.closeTicket(id), onSuccess: (d) => { qc.setQueryData(['ticket', id], d); qc.invalidateQueries({ queryKey: ['tickets'] }); toast(t('Closed — thanks!', 'বন্ধ করা হয়েছে — ধন্যবাদ!')); } });
  const tk = q.data;
  return (
    <Screen header={<Header back title={tk?.subject || 'Support'} right={tk ? <Badge label={TICKET_LABEL[tk.status]} tone={TICKET_TONE[tk.status]} /> : undefined} />}
      onRefresh={q.refetch} refreshing={q.isRefetching}
      footer={tk && tk.status !== 'CLOSED' ? (
        <Footer>
          <Row gap={S.sm} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}><Input value={msg} onChangeText={setMsg} placeholder="Write a reply…" maxLength={1500} multiline /></View>
            <Button title="Send" icon={<Send size={15} color="#fff" />} disabled={!msg.trim()} loading={reply.isPending} onPress={() => reply.mutate()} />
          </Row>
        </Footer>
      ) : undefined}>
      {q.isLoading ? <Loading /> : q.error || !tk ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <View style={{ gap: S.sm, marginTop: S.sm, maxWidth: 680 }}>
          {tk.messages.map((m) => (
            <View key={m.id} style={{ alignSelf: m.fromAdmin ? 'flex-start' : 'flex-end', maxWidth: '86%', gap: 4 }}>
              <View style={{ backgroundColor: m.fromAdmin ? C.surface2 : C.brandSoft, borderRadius: R.lg, borderTopLeftRadius: m.fromAdmin ? 4 : R.lg, borderTopRightRadius: m.fromAdmin ? R.lg : 4, paddingHorizontal: 14, paddingVertical: 10 }}>
                <T v="body" color={m.fromAdmin ? C.text : C.brandDark}>{m.body}</T>
              </View>
              <T v="meta" style={{ alignSelf: m.fromAdmin ? 'flex-start' : 'flex-end' }}>{m.fromAdmin ? t('MaaCrave support', 'MaaCrave সাপোর্ট') : t('You', 'আপনি')} · {ago(m.createdAt)}</T>
            </View>
          ))}
          {tk.status === 'OPEN' ? <T v="meta" center style={{ marginTop: S.md }}>{t('We’ve got your message and will reply here. You’ll get a notification.', 'আপনার বার্তা পেয়েছি, এখানেই উত্তর দেব। নোটিফিকেশন পাবেন।')}</T> : null}
          {tk.status !== 'CLOSED' ? (
            <Button title="My issue is solved" v="ghost" size="sm" style={{ alignSelf: 'center', marginTop: S.md }} onPress={async () => { if (await confirm('Close this request?', 'You can always start a new one.', 'Close')) close.mutate(); }} />
          ) : <Button title="Start a new request" v="ghost" size="sm" style={{ alignSelf: 'center', marginTop: S.md }} onPress={() => router.push('/support/new')} />}
        </View>
      )}
    </Screen>
  );
}
