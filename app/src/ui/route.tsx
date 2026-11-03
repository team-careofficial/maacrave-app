import { Bike, ChefHat, MapPin } from 'lucide-react-native';
import { View } from 'react-native';
import { pointOf, trip } from '../geo';
import { num, t, useLang } from '../i18n';
import { C, R, S } from '../theme';
import { Card, Row, T } from './index';
import { RouteMap } from './map';

type Place = { name: string; area?: string | null; lat?: number | null; lng?: number | null };

/** Pathao-style delivery card: map with the kitchen and the drop point, plus distance and time. */
export function DeliveryRoute({ kitchen, drop, title = 'Delivery route', rider }: { kitchen: Place; drop: Place; title?: string; rider?: { lat: number; lng: number } | null }) {
  useLang();
  const k = pointOf(kitchen), d = pointOf(drop);
  const { km, mins } = trip(k.point, d.point);
  const approx = !k.exact || !d.exact;
  return (
    <Card white style={{ padding: S.sm, gap: S.sm }}>
      <RouteMap from={k.point} to={d.point} fromLabel={kitchen.name} toLabel={drop.name} rider={rider} height={rider ? 230 : 190} />
      <Row style={{ paddingHorizontal: S.sm, paddingBottom: 4, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <T v="eyebrow">{title}</T>
          <Row gap={6}><ChefHat size={14} color={C.brand} /><T v="meta" color={C.text} numberOfLines={1} style={{ flex: 1 }}>{kitchen.name}{kitchen.area ? ` · ${kitchen.area}` : ''}</T></Row>
          <Row gap={6}><MapPin size={14} color={C.ink} /><T v="meta" color={C.text} numberOfLines={1} style={{ flex: 1 }}>{drop.name}{drop.area ? ` · ${drop.area}` : ''}</T></Row>
        </View>
        <View style={{ alignItems: 'flex-end', backgroundColor: C.brandSoft, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8 }}>
          <T v="price" color={C.brandText}>{num(km.toFixed(1))} {t('km', 'কিমি')}</T>
          <Row gap={4}><Bike size={13} color={C.brandText} /><T v="meta" color={C.brandText}>{t(`~${mins} min ride`, `~${num(mins)} মিনিট`)}</T></Row>
        </View>
      </Row>
      {approx ? <T v="meta" style={{ paddingHorizontal: S.sm, paddingBottom: 4 }}>{t('Approximate — set from the area. Pin the exact spot in Delivery addresses for a better estimate.', 'আনুমানিক — এলাকা অনুযায়ী। ঠিকানায় ম্যাপ পিন দিলে আরও সঠিক দেখাবে।')}</T> : null}
    </Card>
  );
}
