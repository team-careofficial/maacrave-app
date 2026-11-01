import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { useAuth } from '@/auth';
import { tk } from '@/format';
import { C, S } from '@/theme';
import { Button, Loading, Screen, T } from '@/ui';

/** Landing page after bKash / SSLCommerz. Status shown here always comes from the server. */
export default function PaymentResult() {
  const { status, orderId } = useLocalSearchParams<{ status?: string; orderId?: string }>();
  const { status: auth } = useAuth();
  const q = useQuery({ queryKey: ['order', orderId], queryFn: () => API.order(orderId!), enabled: !!orderId && auth === 'ready', refetchInterval: (qq) => (qq.state.data?.payment?.status === 'PENDING' ? 3000 : false) });
  const paid = q.data?.payment?.status === 'PAID';
  const pending = !q.data ? status === 'success' : q.data.payment?.status === 'PENDING' && status === 'success';
  const Icon = paid ? CheckCircle2 : XCircle;

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.lg, paddingVertical: S.x5 }}>
        {q.isLoading || pending ? <><Loading /><T v="sub">Confirming your payment…</T></> : (
          <>
            <Icon size={64} color={paid ? C.ok : C.err} />
            <T v="title" center>{paid ? 'Payment successful' : status === 'cancelled' ? 'Payment cancelled' : 'Payment didn’t go through'}</T>
            <T v="sub" center style={{ maxWidth: 340 }}>
              {paid ? `We received ${tk(q.data!.payment!.amount)}. The cook has been notified.` : 'You can try again from your order. If money left your account, email support@maacrave.app with your order code and we’ll sort it out.'}
            </T>
            <Button title={orderId ? 'View order' : 'Go home'} size="lg" onPress={() => router.replace(orderId ? `/order/${orderId}` : '/')} style={{ minWidth: 220 }} />
          </>
        )}
      </View>
    </Screen>
  );
}
