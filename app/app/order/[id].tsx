import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Bike, Check, FileText, KeyRound, LifeBuoy, MapPin, MessageCircle, Phone, Star, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { API } from '@/api';
import { ACTIVE_STATUSES, ago, clock, day, STATUS_LABEL, TIMELINE, tk } from '@/format';
import { num, t } from '@/i18n';
import { CLIENT, openPayment } from '@/pay';
import { C, R, S } from '@/theme';
import type { Order } from '@/types';
import { Button, Card, Chip, confirm, Divider, ErrorState, Header, Input, KV, Loading, Note, Row, Screen, Section, StatusBadge, T, Toggle, useToast } from '@/ui';
import { Grid } from '@/ui/grid';
import { DeliveryRoute } from '@/ui/route';

const CANCELLABLE = ['AWAITING_PAYMENT', 'SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED'];
const PAY_LABEL = { BKASH: 'bKash', SSLCOMMERZ: 'Card / wallet', COD: 'Cash on delivery' } as const;
const COMPLAINTS = ['Missing item', 'Food quality', 'Late delivery', 'Hygiene concern', 'Wrong order', 'Rider behaviour', 'Other'];

function Timeline({ o }: { o: Order }) {
  const steps = TIMELINE.filter((s) => s !== 'RIDER_ASSIGNED' || o.events.some((e) => e.status === s) || TIMELINE.indexOf(o.status) >= TIMELINE.indexOf('RIDER_ASSIGNED'));
  const at = (s: string) => o.events.find((e) => e.status === s || (s === 'SUBMITTED' && e.status === 'COOK_ACCEPTED'))?.createdAt;
  const cur = o.status === 'COOK_ACCEPTED' ? TIMELINE.indexOf('SUBMITTED') : TIMELINE.indexOf(o.status);
  return (
    <View>
      {steps.map((s, i) => {
        const idx = TIMELINE.indexOf(s);
        const done = idx <= cur;
        const now = idx === cur;
        const t = at(s);
        return (
          <Row key={s} style={{ alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? C.brand : C.surface, borderWidth: done ? 0 : 2, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
              </View>
              {i < steps.length - 1 ? <View style={{ width: 2, height: 30, backgroundColor: idx < cur ? C.brand : C.line }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: S.md }}>
              <T v={now ? 'label' : 'sub'} color={done ? C.text : C.muted}>{STATUS_LABEL[s]}</T>
              {t ? <T v="meta">{clock(t)}</T> : null}
            </View>
          </Row>
        );
      })}
    </View>
  );
}

function ReviewBox({ o }: { o: Order }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const m = useMutation({ mutationFn: () => API.review(o.id, stars, text.trim() || undefined), onSuccess: (d) => { qc.setQueryData(['order', o.id], d); toast('Thanks for your review'); } });
  return (
    <Card style={{ gap: S.md }}>
      <T v="card">How was the food?</T>
      <Row gap={S.sm}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} hitSlop={6}>
            <Star size={32} color={C.star} fill={n <= stars ? C.star : 'transparent'} />
          </Pressable>
        ))}
      </Row>
      <Input value={text} onChangeText={setText} placeholder={`Tell others about ${o.cook.displayName.split(' ')[0]}’s cooking`} maxLength={400} multiline style={{ minHeight: 80, alignItems: 'flex-start', paddingVertical: 12 }} />
      <Button title="Submit review" onPress={() => m.mutate()} loading={m.isPending} style={{ alignSelf: 'flex-start' }} />
    </Card>
  );
}

function ComplaintBox({ o, onDone }: { o: Order; onDone: () => void }) {
  const toast = useToast();
  const [type, setType] = useState('Food quality');
  const [text, setText] = useState('');
  const [refund, setRefund] = useState(false);
  const m = useMutation({ mutationFn: () => API.complaint(o.id, { type, text: text.trim(), refundRequested: refund, refundAmount: refund ? o.subtotal : 0 }), onSuccess: () => { toast('Report sent. Our team will reply within 24 hours.'); onDone(); } });
  return (
    <Card style={{ gap: S.md }}>
      <T v="card">Report a problem</T>
      <Row gap={S.sm} wrap>{COMPLAINTS.map((c) => <Chip key={c} label={c} on={type === c} onPress={() => setType(c)} />)}</Row>
      <Input value={text} onChangeText={setText} placeholder="What happened?" maxLength={800} multiline style={{ minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 }} />
      <Toggle value={refund} onChange={setRefund} label={`Request a refund (up to ${tk(o.subtotal)})`} />
      <Button title="How refunds work" v="ghost" size="sm" icon={<FileText size={14} color={C.text} />} onPress={() => router.push('/refund')} style={{ alignSelf: 'flex-start' }} />
      {m.error ? <Note tone="err">{(m.error as Error).message}</Note> : null}
      <Row gap={S.sm}>
        <Button title="Send report" onPress={() => m.mutate()} loading={m.isPending} disabled={text.trim().length < 5} />
        <Button title="Cancel" v="ghost" onPress={onDone} />
      </Row>
    </Card>
  );
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [reporting, setReporting] = useState(false);
  // Faster refresh while a rider is on the way, so the live map keeps up.
  const q = useQuery({ queryKey: ['order', id], queryFn: () => API.order(id), refetchInterval: (qq) => {
    const st = qq.state.data?.status;
    return st && ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(st) ? 10_000 : st && ACTIVE_STATUSES.includes(st) ? 15_000 : false;
  } });
  const cancel = useMutation({ mutationFn: () => API.cancelOrder(id), onSuccess: (d) => { qc.setQueryData(['order', id], d); qc.invalidateQueries({ queryKey: ['orders'] }); toast('Order cancelled'); } });
  const pay = useMutation({ mutationFn: () => API.pay(id, CLIENT), onSuccess: (r) => openPayment(r.paymentUrl, id), onError: (e) => toast((e as Error).message) });
  const o = q.data;

  return (
    <Screen header={<Header back title={o ? `Order ${o.code}` : 'Order'} sub={o ? `${day(o.createdAt)}, ${clock(o.createdAt)}` : undefined} />} onRefresh={q.refetch} refreshing={q.isRefetching}
      footer={o?.status === 'AWAITING_PAYMENT' && o.payment?.method !== 'COD' ? <Button size="lg" style={{ flex: 1 }} title={`Pay ${tk(o.total)} with ${PAY_LABEL[o.payment!.method]}`} loading={pay.isPending} onPress={() => pay.mutate()} /> : undefined}>
      {q.isLoading ? <Loading /> : q.error || !o ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <Grid max={2} gap={S.xl}>
          <View style={{ gap: S.lg }}>
            <Card style={{ gap: S.md, marginTop: S.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}><T v="section">{STATUS_LABEL[o.status]}</T><T v="sub">{o.cook.displayName} · {o.cook.area}</T></View>
                <StatusBadge status={o.status} />
              </Row>
              {o.batch ? <Row gap={6}><Users size={15} color={C.brandText} /><T v="meta" color={C.brandText}>Group order · ready by {clock(o.batch.readyBy)}</T></Row> : null}
              {o.status === 'AWAITING_PAYMENT' ? <Note tone="warn">Waiting for payment. Unpaid orders are cancelled automatically after 20 minutes.</Note> : null}
            </Card>

            {o.deliveryOtp && ['PICKED_UP', 'ON_THE_WAY', 'RIDER_ASSIGNED', 'READY'].includes(o.status) ? (
              <Card style={{ backgroundColor: C.ink, borderColor: C.ink, gap: S.sm }}>
                <Row gap={8}><KeyRound size={18} color="#fff" /><T v="label" color="#fff">Delivery code</T></Row>
                <T v="big" color="#fff" style={{ letterSpacing: 10, fontSize: 34 }}>{o.deliveryOtp}</T>
                <T v="meta" color="rgba(255,255,255,0.75)">Share this only with the rider when your food is in your hands.</T>
              </Card>
            ) : null}

            {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' ? (
              <DeliveryRoute title={STATUS_LABEL[o.status]} kitchen={{ name: o.cook.displayName, area: o.cook.area, lat: o.cook.lat, lng: o.cook.lng }} drop={{ name: 'You', area: o.area, lat: o.lat, lng: o.lng }}
                rider={o.tracking?.lat != null && o.tracking?.lng != null ? { lat: o.tracking.lat, lng: o.tracking.lng } : null} />
            ) : null}
            {o.status !== 'CANCELLED' ? <Card><Timeline o={o} /></Card> : <Note>This order was cancelled. Any online payment is refunded to the same account within 3–7 working days.</Note>}

            {o.rider ? (
              <Card style={{ gap: S.md }}>
                <Row gap={S.md}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.okSoft, alignItems: 'center', justifyContent: 'center' }}><Bike size={20} color={C.ok} /></View>
                  <View style={{ flex: 1 }}>
                    <T v="card" style={{ fontSize: 15 }}>{o.rider.name || t('Your rider', 'আপনার রাইডার')}</T>
                    <T v="meta">{o.tracking ? [o.tracking.vehicle, o.tracking.locatedAt ? t(`location updated ${ago(o.tracking.locatedAt)}`, `লোকেশন আপডেট ${ago(o.tracking.locatedAt)}`) : t('live location not shared yet', 'লাইভ লোকেশন এখনো আসেনি')].filter(Boolean).join(' · ') : t('Rider', 'রাইডার')}</T>
                  </View>
                  {o.tracking?.phone ? <Button title="Call" size="sm" v="outline" icon={<Phone size={15} color={C.text} />} onPress={() => Linking.openURL(`tel:${o.tracking!.phone}`)} /> : null}
                </Row>
                {o.distanceKm ? <T v="meta">{t(`Trip ${o.distanceKm.toFixed(1)} km from the kitchen`, `রান্নাঘর থেকে ${num(o.distanceKm.toFixed(1))} কিমি`)}</T> : null}
              </Card>
            ) : null}
          </View>

          <View style={{ gap: S.lg }}>
            <Section title="Items" style={{ marginTop: S.sm }}>
              <Card style={{ gap: S.sm }}>
                {o.items.map((i) => <KV key={i.id} k={`${i.quantity} × ${i.name}`} v={tk(i.unitPrice * i.quantity)} />)}
                <Divider />
                <KV k="Subtotal" v={tk(o.subtotal)} />
                <KV k={o.distanceKm ? t(`Delivery · ${o.distanceKm.toFixed(1)} km`, `ডেলিভারি · ${num(o.distanceKm.toFixed(1))} কিমি`) : 'Delivery'} v={tk(o.deliveryFee)} />
                <KV k="Service fee" v={tk(o.serviceFee)} />
                {o.tip ? <KV k={t('Rider tip', 'রাইডার টিপ')} v={tk(o.tip)} /> : null}
                {o.discount ? <KV k={`Discount${o.couponCode ? ` (${o.couponCode})` : ''}`} v={`−${tk(o.discount)}`} color={C.ok} /> : null}
                <Divider />
                <KV k="Total" v={tk(o.total)} strong />
                <KV k="Payment" v={`${o.payment ? PAY_LABEL[o.payment.method] : '—'}${o.payment?.status === 'PAID' ? ' · Paid' : o.payment?.status === 'REFUNDED' ? ' · Refunded' : ''}`} />
              </Card>
            </Section>
            <Row gap={8} style={{ alignItems: 'flex-start' }}><MapPin size={16} color={C.muted} /><T v="sub" style={{ flex: 1 }}>{o.addressText}</T></Row>
            {o.notes ? <T v="sub" color={C.text2}>Note: {o.notes}</T> : null}

            {o.status === 'DELIVERED' && !o.review ? <ReviewBox o={o} /> : null}
            {o.review ? <Row gap={6}><Star size={16} color={C.star} fill={C.star} /><T v="sub">You rated this {o.review.stars}/5. Thank you!</T></Row> : null}

            {reporting ? <ComplaintBox o={o} onDone={() => setReporting(false)} /> : (
              <View style={{ gap: S.sm }}>
                {CANCELLABLE.includes(o.status) ? (
                  <Button title="Cancel order" v="danger" loading={cancel.isPending}
                    onPress={async () => { if (await confirm('Cancel this order?', o.payment?.status === 'PAID' ? 'You’ll get a full refund to the account you paid from.' : 'The cook will be told right away.', 'Cancel order', true)) cancel.mutate(); }} />
                ) : null}
                {o.status !== 'AWAITING_PAYMENT' && o.status !== 'CANCELLED' ? <Button title="Report a problem" v="outline" icon={<LifeBuoy size={18} color={C.text} />} onPress={() => setReporting(true)} /> : null}
                {o.status === 'DELIVERED' ? <Button title="Order again" v="secondary" onPress={() => router.push(`/cook/${o.cook.id}`)} /> : null}
              </View>
            )}
            <Card onPress={() => router.push({ pathname: '/support/new', params: { orderId: o.id, code: o.code } })} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface2, borderRadius: R.md }}>
              <MessageCircle size={18} color={C.brand} />
              <View style={{ flex: 1 }}><T v="label">{t('Get help with this order', 'এই অর্ডারে সাহায্য নিন')}</T><T v="meta">{t(`Chat with MaaCrave support · ${o.code}`, `MaaCrave সাপোর্টে লিখুন · ${o.code}`)}</T></View>
            </Card>
          </View>
        </Grid>
      )}
    </Screen>
  );
}
