import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { ago } from '@/format';
import { C, S } from '@/theme';
import { Card, Empty, ErrorState, Header, Loading, Row, Screen, T } from '@/ui';

export default function Notifications() {
  const { mode } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications', mode], queryFn: () => API.notifications(mode) });
  const read = useMutation({ mutationFn: () => API.readAll(mode), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', mode] }) });
  const unread = (q.data || []).some((n) => !n.read);
  // Mark everything read shortly after the list is seen.
  useEffect(() => { if (unread) { const t = setTimeout(() => read.mutate(), 1500); return () => clearTimeout(t); } }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen header={<Header back title="Notifications" />} onRefresh={q.refetch}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.data?.length ? (
        <View style={{ gap: S.sm, marginTop: S.sm }}>
          {q.data.map((n) => (
            <Card key={n.id} style={{ padding: S.md, backgroundColor: n.read ? C.surface : C.brandSoft, borderColor: n.read ? C.line : C.brandSoft }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.read ? 'transparent' : C.brand }} />
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}><T v="label" style={{ flex: 1 }}>{n.title}</T><T v="meta">{ago(n.createdAt)}</T></Row>
                  <T v="sub" color={C.text2}>{n.body}</T>
                </View>
              </Row>
            </Card>
          ))}
        </View>
      ) : <Empty Icon={Bell} title="You’re all caught up" text="Order updates and price replies from cooks will appear here." />}
    </Screen>
  );
}
