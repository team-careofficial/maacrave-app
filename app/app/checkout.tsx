import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Banknote, CreditCard, MapPin, Plus, Smartphone, Tag } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { API, type CheckoutBody } from '@/api';
import { useCart } from '@/cart';
import { tk } from '@/format';
import { useAddresses, useMeta } from '@/hooks';
import { CLIENT, openPayment } from '@/pay';
import { C, S } from '@/theme';
import type { PaymentMethod } from '@/types';
import { Button, Card, Choice, Divider, ErrorState, Header, Input, KV, Loading, Note, Row, Screen, Section, T, useToast } from '@/ui';
import { Grid } from '@/ui/grid';
import { DeliveryRoute } from '@/ui/route';

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function Checkout() {
  const p = useLocalSearchParams<{ kind: 'cart' | 'batch' | 'request'; batchId?: string; quantity?: string; requestId?: string; proposalId?: string; allowGroup?: string }>();
  const cart = useCart();
  const qc = useQueryClient();
  const toast = useToast();
  const meta = useMeta();
  const addresses = useAddresses();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('COD');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const idem = useRef(newKey());

  const body = useMemo<CheckoutBody | null>(() => {
    if (p.kind === 'batch' && p.batchId) return { kind: 'batch', batchId: p.batchId, quantity: Number(p.quantity) || 1, couponCode: coupon };
    if (p.kind === 'request' && p.requestId && p.proposalId) return { kind: 'request', requestId: p.requestId, proposalId: p.proposalId, allowGroup: p.allowGroup === '1', couponCode: coupon };
    if (p.kind === 'cart' && cart.lines.length) return { kind: 'cart', items: cart.lines.map((l) => ({ dishId: l.dishId, quantity: l.quantity })), couponCode: coupon };
    return null;
  }, [p.kind, p.batchId, p.quantity, p.requestId, p.proposalId, p.allowGroup, cart.lines, coupon]);

  // Which kitchen is cooking: the cart's kitchen, the group order's kitchen, or the cook whose price was accepted.
  const batchQ = useQuery({ queryKey: ['batch', p.batchId], queryFn: () => API.batch(p.batchId!), enabled: p.kind === 'batch' && !!p.batchId });
  const reqQ = useQuery({ queryKey: ['requests'], queryFn: API.requests, enabled: p.kind === 'request' });
  const cookId = p.kind === 'cart' ? cart.cookId : p.kind === 'batch' ? batchQ.data?.cookId : reqQ.data?.find((r) => r.id === p.requestId)?.proposals.find((x) => x.id === p.proposalId)?.cook.id;
  const cookQ = useQuery({ queryKey: ['cook', cookId], queryFn: () => API.cook(cookId!), enabled: !!cookId });

  const quote = useQuery({ queryKey: ['quote', body], queryFn: () => API.quote(body!), enabled: !!body });
  const addr = addresses.data?.find((a) => a.id === addressId) || addresses.data?.find((a) => a.isDefault) || addresses.data?.[0];
  const pay = meta.data?.payments;

  const place = useMutation({
    mutationFn: () => API.placeOrder({ ...body!, addressId: addr!.id, paymentMethod: method, notes: notes.trim() || undefined, idempotencyKey: idem.current, client: CLIENT }),
    onSuccess: async (r) => {
      if (p.kind === 'cart') cart.clear();
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      if (r.paymentUrl) return openPayment(r.paymentUrl, r.order.id);
      if (r.paymentError) toast(r.paymentError);
      router.replace(`/order/${r.order.id}`);
    },
  });

  if (!body) return <Screen header={<Header back title="Checkout" />}><Note>Nothing to check out. Add something to your cart first.</Note></Screen>;
  const f = quote.data?.fees;
  const methods: { key: PaymentMethod; label: string; sub: string; Icon: typeof Banknote; on: boolean }[] = [
    { key: 'BKASH', label: 'bKash', sub: pay?.bkash ? 'Pay securely with your bKash account' : 'Coming soon', Icon: Smartphone, on: !!pay?.bkash },
    { key: 'SSLCOMMERZ', label: 'Card, Nagad or Rocket', sub: pay?.card ? 'Visa, Mastercard, Amex and mobile wallets' : 'Coming soon', Icon: CreditCard, on: !!pay?.card },
    { key: 'COD', label: 'Cash on delivery', sub: 'Pay the rider when the food arrives', Icon: Banknote, on: true },
  ];

  return (
    <Screen header={<Header back title="Checkout" sub={p.kind === 'batch' ? 'Joining a group order' : p.kind === 'request' ? 'Your requested dish' : cart.cookName || undefined} />}
      footer={<Button size="lg" style={{ flex: 1 }} disabled={!addr || !f || place.isPending} loading={place.isPending}
        title={f ? (method === 'COD' ? `Place order · ${tk(f.total)}` : `Pay ${tk(f.total)}`) : 'Place order'} onPress={() => place.mutate()} />}>
      <Grid max={2} gap={S.xl}>
        <View>
          <Section title="Deliver to" style={{ marginTop: S.sm }}>
            {addresses.isLoading ? <Loading /> : addresses.data?.length ? (
              <View style={{ gap: S.sm }}>
                {addresses.data.map((a) => <Choice key={a.id} on={addr?.id === a.id} onPress={() => setAddressId(a.id)} label={`${a.label} · ${a.area}`} sub={[`House ${a.house}`, a.road, a.floor, a.landmark].filter(Boolean).join(', ')} />)}
              </View>
            ) : <Note tone="warn">Add where we should deliver.</Note>}
            <Button title="Add new address" v="ghost" size="sm" icon={<Plus size={16} color={C.text} />} onPress={() => router.push('/addresses')} style={{ alignSelf: 'flex-start' }} />
          </Section>

          <Section title="Payment">
            <View style={{ gap: S.sm }}>
              {methods.map((m) => (
                <Choice key={m.key} on={method === m.key} disabled={!m.on} onPress={() => setMethod(m.key)} label={m.label} sub={m.sub}
                  right={<m.Icon size={20} color={m.on ? C.text2 : C.muted} />} />
              ))}
            </View>
          </Section>

          <Section title="Note for the cook">
            <Input value={notes} onChangeText={setNotes} placeholder="Allergies, less spice, gate code…" maxLength={300} multiline style={{ minHeight: 80, alignItems: 'flex-start', paddingVertical: 12 }} />
          </Section>
        </View>

        <View>
          {cookQ.data && addr ? (
            <View style={{ marginTop: S.sm }}>
              <DeliveryRoute kitchen={{ name: cookQ.data.displayName, area: cookQ.data.area, lat: cookQ.data.lat, lng: cookQ.data.lng }} drop={{ name: addr.label, area: addr.area, lat: addr.lat, lng: addr.lng }} />
            </View>
          ) : null}
          <Section title="Order summary" style={{ marginTop: S.lg }}>
            {quote.isLoading ? <Loading /> : quote.error ? <ErrorState error={quote.error} onRetry={quote.refetch} /> : f ? (
              <Card style={{ gap: S.sm }}>
                {quote.data!.items.map((i, k) => <KV key={k} k={`${i.quantity} × ${i.name}`} v={tk(i.unitPrice * i.quantity)} />)}
                <Divider />
                <KV k="Subtotal" v={tk(f.subtotal)} />
                <KV k={p.kind === 'batch' ? 'Delivery (group rate)' : 'Delivery'} v={tk(f.deliveryFee)} />
                <KV k="Service fee" v={tk(f.serviceFee)} />
                {f.discount ? <KV k={`Discount (${f.couponCode})`} v={`−${tk(f.discount)}`} color={C.ok} /> : null}
                <Divider />
                <KV k="Total" v={tk(f.total)} strong />
              </Card>
            ) : null}
          </Section>
          <Section title="Coupon">
            <Row gap={S.sm}>
              <View style={{ flex: 1 }}><Input value={couponInput} onChangeText={(t) => setCouponInput(t.toUpperCase())} placeholder="Enter code" autoCapitalize="characters" maxLength={20} /></View>
              <Button title={coupon ? 'Remove' : 'Apply'} v="outline" icon={<Tag size={16} color={C.text} />} onPress={() => (coupon ? (setCoupon(undefined), setCouponInput('')) : setCoupon(couponInput.trim() || undefined))} />
            </Row>
            {quote.data?.couponError ? <T v="meta" color={C.err}>{quote.data.couponError}</T> : f?.couponCode ? <T v="meta" color={C.ok}>{f.couponCode} applied</T> : null}
            {meta.data?.coupons.length ? <T v="meta">Available: {meta.data.coupons.map((c) => `${c.code} — ${c.description}`).join(' · ')}</T> : null}
          </Section>
          {addr ? <Row gap={6} style={{ marginTop: S.lg }}><MapPin size={14} color={C.muted} /><T v="meta" style={{ flex: 1 }}>Delivering to {addr.label}, {addr.area}. The rider will ask for a 4-digit code when handing over.</T></Row> : null}
          {place.error ? <View style={{ marginTop: S.md }}><Note tone="err">{(place.error as Error).message}</Note></View> : null}
        </View>
      </Grid>
    </Screen>
  );
}
