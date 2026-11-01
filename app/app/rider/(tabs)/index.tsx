import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, MapPin, Package, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { firstName, tk } from '@/format';
import { C, S } from '@/theme';
import type { RiderTask } from '@/types';
import { Badge, Button, Card, Empty, ErrorState, IconButton, Loading, Row, Screen, Section, T, Toggle, useToast } from '@/ui';
import { BrandBar } from '@/ui/brand';
import { Grid } from '@/ui/grid';

function TaskCard({ t }: { t: RiderTask }) {
  const qc = useQueryClient();
  const toast = useToast();
  const accept = useMutation({
    mutationFn: () => API.acceptTask(t.key),
    onSuccess: (d) => { qc.setQueryData(['riderActive'], d); qc.invalidateQueries({ queryKey: ['riderTasks'] }); toast('Trip accepted — head to the kitchen'); router.push('/rider/tasks'); },
    onError: (e) => { toast((e as Error).message); qc.invalidateQueries({ queryKey: ['riderTasks'] }); },
  });
  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><T v="card">{t.cook.displayName}</T><Row gap={4}><MapPin size={13} color={C.muted} /><T v="meta">Pick up in {t.cook.area}</T></Row></View>
        <T v="price" color={C.ok}>{tk(t.earning)}</T>
      </Row>
      <Row gap={S.sm} wrap>
        {t.isBatch ? <Badge tone="brand" label="Group route" icon={<Users size={12} color={C.brandText} />} /> : null}
        <Badge label={`${t.drops} drop${t.drops > 1 ? 's' : ''}`} />
        <Badge label={`${t.packages} item${t.packages > 1 ? 's' : ''}`} icon={<Package size={12} color={C.text2} />} />
      </Row>
      <T v="sub">Drop in {t.dropAreas.join(', ')}</T>
      <Button title="Accept trip" v="dark" loading={accept.isPending} onPress={() => accept.mutate()} />
    </Card>
  );
}

export default function RiderHome() {
  const { me, reload } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const online = !!me?.rider?.online;
  const tasks = useQuery({ queryKey: ['riderTasks'], queryFn: API.riderTasks, refetchInterval: online ? 15_000 : false });
  const active = useQuery({ queryKey: ['riderActive'], queryFn: API.riderActive });
  const notifs = useQuery({ queryKey: ['notifications', 'RIDER'], queryFn: () => API.notifications('RIDER') });
  const status = useMutation({ mutationFn: (v: boolean) => API.riderStatus(v), onSuccess: async (_, v) => { await reload(); qc.invalidateQueries({ queryKey: ['riderTasks'] }); toast(v ? 'You’re online' : 'You’re offline'); } });
  const unread = (notifs.data || []).filter((n) => !n.read).length;

  return (
    <Screen onRefresh={() => { tasks.refetch(); active.refetch(); }} refreshing={tasks.isRefetching}
      header={<BrandBar sub={`Rider · ${firstName(me?.name)}`} right={
        <IconButton label="Notifications" badge={unread} onPress={() => router.push('/notifications')}><Bell size={20} color={C.text} /></IconButton>
      } />}>
      <Card style={{ marginTop: S.sm, backgroundColor: online ? C.okSoft : C.card }}>
        <Toggle value={online} onChange={(v) => status.mutate(v)} label={online ? 'You’re online' : 'You’re offline'} sub={online ? 'New pickups near you appear below.' : 'Go online to see pickups and get alerts.'} />
      </Card>
      {active.data?.length ? (
        <Card accent onPress={() => router.push('/rider/tasks')} style={{ marginTop: S.md }}>
          <Row><T v="label" style={{ flex: 1 }}>{active.data.length} drop{active.data.length > 1 ? 's' : ''} in progress</T><T v="label" color={C.brandText}>Continue</T></Row>
        </Card>
      ) : null}
      <Section title="Ready for pickup" sub={online ? 'Accept a trip to lock it — first come, first served.' : undefined}>
        {!online ? <Empty Icon={Package} title="You’re offline" text="Switch on to start receiving pickups." />
          : tasks.isLoading ? <Loading /> : tasks.error ? <ErrorState error={tasks.error} onRetry={tasks.refetch} />
          : tasks.data?.length ? <Grid max={2}>{tasks.data.map((t) => <TaskCard key={t.key} t={t} />)}</Grid>
          : <Empty Icon={Package} title="No pickups right now" text="We’ll notify you as soon as a kitchen marks food ready." />}
      </Section>
    </Screen>
  );
}
