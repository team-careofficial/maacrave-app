import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { API } from '@/api';
import { S } from '@/theme';
import { Empty, ErrorState, Header, Loading, OrderCard, Screen, Segmented } from '@/ui';
import { Grid } from '@/ui/grid';

export default function Orders() {
  const [scope, setScope] = useState<'active' | 'past'>('active');
  const q = useQuery({ queryKey: ['orders', scope], queryFn: () => API.orders(scope), refetchInterval: scope === 'active' ? 20_000 : false });
  return (
    <Screen header={<Header title="Orders" sub="Track deliveries and reorder favourites" />} onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Segmented value={scope} onChange={setScope} items={[{ key: 'active', label: 'Active' }, { key: 'past', label: 'Past' }]} />
      <View style={{ marginTop: S.lg }}>
        {q.isLoading ? <Loading /> : q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : q.data?.length ? (
          <Grid max={2}>{q.data.map((o) => <OrderCard key={o.id} o={o} />)}</Grid>
        ) : (
          <Empty Icon={Receipt} title={scope === 'active' ? 'No active orders' : 'No past orders yet'}
            text={scope === 'active' ? 'When you order, you can follow it live here — from the kitchen to your door.' : 'Delivered and cancelled orders show up here.'}
            action={scope === 'active' ? 'Browse food' : undefined} onAction={() => router.push('/browse')} />
        )}
      </View>
    </Screen>
  );
}
