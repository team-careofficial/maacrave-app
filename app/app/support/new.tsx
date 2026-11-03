import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { t } from '@/i18n';
import { S } from '@/theme';
import type { Role } from '@/types';
import { Button, Chip, Field, Footer, Header, Input, Note, Row, Screen, useToast } from '@/ui';

const TOPICS: Record<string, string[]> = {
  CUSTOMER: ['Order problem', 'Payment or refund', 'Account', 'Suggestion', 'Something else'],
  COOK: ['Orders', 'Earnings or payout', 'Rates and commission', 'Menu or kitchen', 'Something else'],
  RIDER: ['Trip problem', 'Earnings or cash', 'Rates', 'Safety', 'Something else'],
};

export default function NewTicket() {
  const p = useLocalSearchParams<{ orderId?: string; code?: string }>();
  const { mode } = useAuth();
  const role: Role = mode === 'COOK' || mode === 'RIDER' ? mode : 'CUSTOMER';
  const qc = useQueryClient();
  const toast = useToast();
  const [topic, setTopic] = useState(p.orderId ? TOPICS[role][0] : '');
  const [subject, setSubject] = useState(p.code ? `${t('Order', 'অর্ডার')} ${p.code}` : '');
  const [body, setBody] = useState('');
  const title = [topic, subject.trim()].filter(Boolean).join(' · ').slice(0, 80);
  const send = useMutation({
    mutationFn: () => API.openTicket({ role, subject: title, body: body.trim(), orderId: p.orderId }),
    onSuccess: (tk) => { qc.invalidateQueries({ queryKey: ['tickets'] }); toast(t('Sent — we’ll reply soon', 'পাঠানো হয়েছে — শিগগিরই উত্তর দেব')); router.replace(`/support/${tk.id}`); },
    onError: (e: Error) => toast(e.message),
  });
  const ok = title.length >= 3 && body.trim().length >= 5;
  return (
    <Screen header={<Header back title="Write to us" />} footer={<Footer><Button full size="lg" title="Send" disabled={!ok} loading={send.isPending} onPress={() => send.mutate()} /></Footer>}>
      <View style={{ gap: S.lg, marginTop: S.sm, maxWidth: 640 }}>
        {p.code ? <Note>{t(`About order ${p.code}`, `অর্ডার ${p.code} সম্পর্কে`)}</Note> : null}
        <Field label="What is it about?">
          <Row gap={S.sm} wrap>{TOPICS[role].map((x) => <Chip key={x} label={x} on={topic === x} onPress={() => setTopic(x)} />)}</Row>
        </Field>
        <Input label="Short title (optional)" value={subject} onChangeText={setSubject} maxLength={60} placeholder="e.g. Rider couldn’t find my house" />
        <Input label="Tell us what happened" value={body} onChangeText={setBody} maxLength={1500} multiline placeholder="The more detail you give, the faster we can help." style={{ minHeight: 120, textAlignVertical: 'top' }} />
      </View>
    </Screen>
  );
}
