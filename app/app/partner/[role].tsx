import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/auth';
import { BadgeCheck, Banknote, Bike, ChefHat, FileText, Route, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { API } from '@/api';
import { day, tk } from '@/format';
import { num, t, useLang } from '@/i18n';
import { C, R, S } from '@/theme';
import type { RateCard } from '@/types';
import { Badge, Button, Card, Divider, ErrorState, Footer, Header, KV, Loading, Note, Row, Screen, Section, T, Tap, useToast } from '@/ui';

const pct = (n: number) => `${num(Number.isInteger(n) ? n : n.toFixed(1))}%`;

function CookRates({ r }: { r: RateCard }) {
  const sale = 200, cut = Math.round((sale * r.commissionPct) / 100);
  return (
    <>
      <View style={{ backgroundColor: C.brandSoft, borderRadius: R.xl, padding: S.xl, gap: 6 }}>
        <T v="eyebrow" color={C.brandText}>{t('You keep', 'আপনি পাবেন')}</T>
        <T v="big" color={C.brandDark}>{pct(100 - r.commissionPct)}</T>
        <T v="sub" color={C.brandText}>{t(`of the food price on every delivered order. MaaCrave’s commission is ${r.commissionPct}%.`, `প্রতিটি ডেলিভারি হওয়া অর্ডারে খাবারের দামের। MaaCrave-এর কমিশন ${num(r.commissionPct)}%।`)}</T>
      </View>
      <Section title="Example order">
        <Card style={{ gap: S.sm }}>
          <KV k={t('Customer orders food worth', 'গ্রাহকের খাবারের দাম')} v={tk(sale)} />
          <KV k={t(`MaaCrave commission (${r.commissionPct}%)`, `MaaCrave কমিশন (${num(r.commissionPct)}%)`)} v={`−${tk(cut)}`} color={C.err} />
          <Divider />
          <KV k={t('You get', 'আপনি পাবেন')} v={tk(sale - cut)} strong color={C.ok} />
          <T v="meta">{t(`Delivery (from ${tk(r.deliveryFee)}) and the ${tk(r.serviceFee)} service fee are paid by the customer — nothing is taken from you for them.`, `ডেলিভারি (${tk(r.deliveryFee)} থেকে) ও ${tk(r.serviceFee)} সার্ভিস ফি গ্রাহক দেন — এর জন্য আপনার কাছ থেকে কিছু কাটা হয় না।`)}</T>
        </Card>
      </Section>
      <Section title="How you’re paid">
        <Card style={{ gap: S.md }}>
          <Row gap={S.md}><Wallet size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t('Withdraw your balance to bKash from Earnings. Paid within 3 working days.', 'Earnings থেকে বিকাশে টাকা তুলুন। ৩ কর্মদিবসের মধ্যে পাবেন।')}</T></Row>
          <Row gap={S.md}><FileText size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t('Every order shows the price, the commission and what you get.', 'প্রতিটি অর্ডারে দাম, কমিশন ও আপনার প্রাপ্য দেখা যায়।')}</T></Row>
          <Row gap={S.md}><ChefHat size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t('Refunds caused by your food (wrong, missing or spoiled) are deducted from your balance.', 'আপনার খাবারের কারণে (ভুল, কম বা নষ্ট) রিফান্ড হলে আপনার জমা থেকে কাটা হয়।')}</T></Row>
        </Card>
      </Section>
    </>
  );
}

function RiderRates({ r }: { r: RateCard }) {
  const ex = (km: number, batch = false) => (batch ? r.riderBatchDrop : r.riderBase) + Math.round(km * r.riderPerKm);
  return (
    <>
      <View style={{ backgroundColor: C.brandSoft, borderRadius: R.xl, padding: S.xl, gap: 6 }}>
        <T v="eyebrow" color={C.brandText}>{t('Per delivery', 'প্রতি ডেলিভারিতে')}</T>
        <T v="big" color={C.brandDark}>{tk(r.riderBase)} + {tk(r.riderPerKm)}{t('/km', '/কিমি')}</T>
        <T v="sub" color={C.brandText}>{t('Base pay plus every kilometre from the kitchen to the customer. You see the amount before you accept.', 'মূল টাকা, সাথে রান্নাঘর থেকে গ্রাহক পর্যন্ত প্রতি কিলোমিটারের টাকা। ট্রিপ নেওয়ার আগেই টাকা দেখা যায়।')}</T>
      </View>
      <Section title="What a trip pays">
        <Card style={{ gap: S.sm }}>
          {[2, 4, 7].map((k) => <KV key={k} k={t(`${k} km drop`, `${num(k)} কিমি ডেলিভারি`)} v={tk(ex(k))} />)}
          <Divider />
          <KV k={t(`Group-order drop (3 km)`, `গ্রুপ অর্ডারের প্রতি ডেলিভারি (৩ কিমি)`)} v={tk(ex(3, true))} />
          <T v="meta">{t('Group drops share one pickup, so you deliver several in one run.', 'গ্রুপ অর্ডারে একবার তুলে একসাথে কয়েকটি পৌঁছে দেন।')}</T>
        </Card>
      </Section>
      <Section title="Cash and settlement">
        <Card style={{ gap: S.md }}>
          <Row gap={S.md}><Banknote size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t(`You can hold up to ${tk(r.riderCashLimit)} of customer cash. Above that, deposit it before taking new cash orders.`, `গ্রাহকের নগদ সর্বোচ্চ ${tk(r.riderCashLimit)} পর্যন্ত রাখতে পারবেন। এর বেশি হলে নতুন ক্যাশ অর্ডার নেওয়ার আগে জমা দিন।`)}</T></Row>
          <Row gap={S.md}><Wallet size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t('Earnings are settled weekly to bKash, minus any cash you’re still holding.', 'আয় প্রতি সপ্তাহে বিকাশে দেওয়া হয়, হাতে থাকা নগদ বাদ দিয়ে।')}</T></Row>
          <Row gap={S.md}><Route size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t('Share your location while online — the nearest riders hear about each pickup first.', 'অনলাইনে থাকাকালীন লোকেশন শেয়ার করুন — কাছের রাইডাররা আগে পিকআপের খবর পান।')}</T></Row>
          <Row gap={S.md}><Bike size={18} color={C.brand} /><T v="body" style={{ flex: 1 }}>{t('Tips from customers are 100% yours.', 'গ্রাহকের দেওয়া টিপসের পুরোটাই আপনার।')}</T></Row>
        </Card>
      </Section>
    </>
  );
}

/** Rate card + key terms that a cook or rider accepts before going online. Shown again whenever rates change. */
export default function PartnerTermsScreen() {
  useLang();
  const { role: raw } = useLocalSearchParams<{ role: string }>();
  const role = raw === 'rider' ? 'RIDER' : 'COOK';
  const { status, canUse } = useAuth();
  const allowed = canUse(role);
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ['terms', role], queryFn: () => API.partnerTerms(role), enabled: allowed });
  const accept = useMutation({
    mutationFn: () => API.acceptTerms(role),
    onSuccess: (d) => { qc.setQueryData(['terms', role], d); toast(t('Thanks — you can go online now', 'ধন্যবাদ — এখন অনলাইনে যেতে পারবেন')); router.back(); },
    onError: (e: Error) => toast(e.message),
  });
  const d = q.data;
  if (status === 'loading') return null;
  if (!allowed) return <Redirect href="/" />;
  return (
    <Screen header={<Header back title="Rates & terms" sub={role === 'COOK' ? 'Mother / Cook partner' : 'Rider partner'} />}
      footer={d && !d.accepted ? <Footer><Button full size="lg" title="I agree to the rates and terms" loading={accept.isPending} onPress={() => accept.mutate()} /></Footer> : undefined}
      onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error || !d ? <ErrorState error={q.error} onRetry={q.refetch} /> : (
        <View style={{ gap: S.md, marginTop: S.sm, maxWidth: 720 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge label={t(`Rates version ${d.rates.version}`, `রেট সংস্করণ ${num(d.rates.version)}`)} />
            {d.accepted ? <Badge tone="ok" label={t(`Accepted ${d.acceptedAt ? day(d.acceptedAt) : ''}`, `গৃহীত ${d.acceptedAt ? num(day(d.acceptedAt)) : ''}`)} icon={<BadgeCheck size={12} color={C.ok} />} /> : <Badge tone="warn" label="Needs your OK" />}
          </Row>
          {!d.accepted && d.lastAcceptedVersion ? <Note tone="warn">{t('MaaCrave’s rates have changed since you last agreed. Please review them below.', 'আপনার শেষ সম্মতির পর রেট বদলেছে। নিচে দেখে নিন।')}</Note> : null}
          {role === 'COOK' ? <CookRates r={d.rates} /> : <RiderRates r={d.rates} />}
          <Section title="Full terms">
            <Card white style={{ padding: 0 }}>
              {[
                { label: role === 'COOK' ? t('Cook partner terms', 'রাঁধুনি পার্টনার শর্তাবলি') : t('Rider partner terms', 'রাইডার পার্টনার শর্তাবলি'), to: role === 'COOK' ? '/cook-terms' : '/rider-terms' },
                { label: t('Refund & cancellation policy', 'রিফান্ড ও বাতিল নীতি'), to: '/refund' },
                { label: t('Privacy policy', 'গোপনীয়তা নীতি'), to: '/privacy' },
              ].map((l, i) => (
                <Tap key={l.to} onPress={() => router.push(l.to as never)} scale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <FileText size={17} color={C.brand} /><T v="body" style={{ flex: 1 }}>{l.label}</T>
                </Tap>
              ))}
            </Card>
          </Section>
          <T v="meta" style={{ marginBottom: S.lg }}>{t('By agreeing you confirm you’ve read the partner terms. If rates change, we’ll tell you first and ask again.', 'সম্মতি দিয়ে আপনি নিশ্চিত করছেন যে পার্টনার শর্তাবলি পড়েছেন। রেট বদলালে আগে জানিয়ে আবার সম্মতি নেওয়া হবে।')}</T>
        </View>
      )}
    </Screen>
  );
}
