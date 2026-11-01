import { LegalPage } from '@/ui/legal';

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="2 November 2026" sections={[
      { h: 'The service', p: 'MaaCrave connects customers with independent home cooks and riders. Cooks prepare the food and are responsible for its quality and hygiene; MaaCrave verifies cooks and riders before they can start.' },
      { h: 'Your account', p: 'Keep your phone and email secure. You are responsible for orders placed from your account. We may suspend accounts that misuse the service, place fake orders or harm others.' },
      { h: 'Orders and payment', p: 'Prices, fees and the total are shown before you pay. Online payments are confirmed by the payment provider. Cash on delivery is paid to the rider.' },
      { h: 'Cancellations and refunds', p: 'You can cancel until the cook starts cooking. Cancelled or declined online payments are refunded to the original method. If something goes wrong, report it from the order screen within 24 hours.' },
      { h: 'Group orders and requests', p: 'Group orders start only when the minimum is reached; otherwise everyone is refunded. Accepting a cook’s price for a request creates an order at that price.' },
      { h: 'Cooks and riders', p: 'Cooks and riders must give accurate identity details, follow food-safety and road-safety rules, and treat customers with respect. Earnings are paid after commission as shown in the app.' },
    ]} />
  );
}
