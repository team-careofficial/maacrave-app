import { View } from 'react-native';
import { C, S } from '../theme';
import { Rating, Row, T } from './index';

export function ReviewList({ reviews }: { reviews: { id: string; stars: number; text: string | null; user: { name: string }; dish?: { name: string } | null }[] }) {
  if (!reviews.length) return <T v="sub">No reviews yet — be the first after your order.</T>;
  return (
    <View style={{ gap: S.md }}>
      {reviews.map((r) => (
        <View key={r.id} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}><T v="label">{r.user.name}{r.dish ? <T v="meta"> · {r.dish.name}</T> : null}</T><Rating value={r.stars} /></Row>
          {r.text ? <T v="sub" color={C.text2}>{r.text}</T> : null}
        </View>
      ))}
    </View>
  );
}

