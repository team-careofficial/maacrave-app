import { LegalPage } from '@/ui/legal';

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="2 November 2026" sections={[
      { h: 'What we collect', p: 'Your name, mobile number or email, delivery addresses and area, your orders and requests, and reviews or reports you write. Cooks and riders also give NID details and photos for verification. Payments are handled by bKash or SSLCommerz; we never see your card or wallet PIN.' },
      { h: 'Why we use it', p: 'To sign you in, deliver your food, connect you with cooks and riders, prevent fraud, handle refunds and complaints, and send order updates. We do not sell your personal data.' },
      { h: 'Who can see it', p: 'A cook sees your first name, order and delivery area. A rider sees your name, address and phone only after picking up your food. Verification documents are visible only to the MaaCrave team.' },
      { h: 'How long we keep it', p: 'While your account is open. If you delete your account, we remove your personal details and keep only order records needed for accounting, without your name or contact.' },
      { h: 'Your choices', p: 'You can edit your details in Account, turn off notifications in your phone settings, and delete your account from Account → Delete account at any time.' },
      { h: 'Security', p: 'Sign-in uses one-time codes, sessions are encrypted, and our team uses a separate, access-controlled admin system.' },
    ]} />
  );
}
