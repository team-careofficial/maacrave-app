import { router } from 'expo-router';
import { ShoppingBag, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useCart } from '@/cart';
import { tk } from '@/format';
import { useMeta } from '@/hooks';
import { C, S } from '@/theme';
import { Button, Card, confirm, Divider, Empty, Header, KV, Note, Row, Screen, Section, Stepper, T } from '@/ui';

export default function CartScreen() {
  const cart = useCart();
  const meta = useMeta();
  const fees = meta.data?.fees;
  if (!cart.lines.length) {
    return (
      <Screen header={<Header back title="Cart" />}>
        <Empty Icon={ShoppingBag} title="Your cart is empty" text="Add a homemade dish and it will wait for you here." action="Browse food" onAction={() => router.replace('/browse')} />
      </Screen>
    );
  }
  return (
    <Screen header={<Header back title="Cart" sub={`From ${cart.cookName}`} right={
      <Pressable accessibilityLabel="Clear cart" hitSlop={10} onPress={async () => { if (await confirm('Clear cart?', 'All items will be removed.', 'Clear', true)) cart.clear(); }}><Trash2 size={20} color={C.muted} /></Pressable>
    } />}
      footer={<Button title={`Go to checkout · ${tk(cart.subtotal + (fees ? fees.serviceFee + fees.deliveryFee : 0))}`} size="lg" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/checkout', params: { kind: 'cart' } })} />}>
      <Card style={{ gap: S.md, marginTop: S.sm }}>
        {cart.lines.map((l, i) => (
          <View key={l.dishId} style={{ gap: S.md }}>
            {i ? <Divider /> : null}
            <Row>
              <View style={{ flex: 1 }}>
                <T v="card" numberOfLines={2}>{l.name}</T>
                <T v="meta">{tk(l.price)} each</T>
              </View>
              <Stepper value={l.quantity} min={0} onChange={(n) => cart.setQty(l.dishId, n)} />
              <T v="price" style={{ minWidth: 64, textAlign: 'right' }}>{tk(l.price * l.quantity)}</T>
            </Row>
          </View>
        ))}
      </Card>
      <Button title="Add more from this kitchen" v="ghost" size="sm" onPress={() => cart.cookId && router.push(`/cook/${cart.cookId}`)} style={{ alignSelf: 'flex-start', marginTop: S.sm }} />
      <Section title="Bill">
        <Card style={{ gap: S.sm }}>
          <KV k="Subtotal" v={tk(cart.subtotal)} />
          {fees ? <><KV k="Delivery" v={tk(fees.deliveryFee)} /><KV k="Service fee" v={tk(fees.serviceFee)} /><Divider /><KV k="Total" v={tk(cart.subtotal + fees.serviceFee + fees.deliveryFee)} strong /></> : null}
        </Card>
        <Note>Coupons and the final price are confirmed at checkout.</Note>
      </Section>
    </Screen>
  );
}
