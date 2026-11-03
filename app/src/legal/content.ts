/**
 * Legal texts shown in the app and on the website, in English and Bangla.
 * These are a careful starting point written for MaaCrave's actual flows — have them reviewed by a Bangladeshi lawyer before public launch.
 */
export type Bi = { en: string; bn: string };
export type LegalSection = { h: Bi; p: Bi; points?: Bi[] };
export type LegalDoc = { key: string; title: Bi; intro: Bi; updated: string; highlights: Bi[]; sections: LegalSection[] };

const UPDATED = '3 November 2026';

export const TERMS: LegalDoc = {
  key: 'terms', updated: UPDATED,
  title: { en: 'Terms of Service', bn: 'সেবার শর্তাবলি' },
  intro: {
    en: 'These terms explain how MaaCrave works and what you and we agree to when you use the app or website. Please read them — they are written in plain language.',
    bn: 'MaaCrave কীভাবে কাজ করে এবং অ্যাপ বা ওয়েবসাইট ব্যবহার করলে আপনি ও আমরা কী মেনে চলি, তা এখানে সহজ ভাষায় লেখা আছে।',
  },
  highlights: [
    { en: 'Prices and fees are shown before you order', bn: 'অর্ডারের আগেই দাম ও ফি দেখানো হয়' },
    { en: 'Cancel free until the cook starts', bn: 'রান্না শুরুর আগে বিনা খরচে বাতিল' },
    { en: 'Report a problem within 24 hours', bn: 'সমস্যা হলে ২৪ ঘণ্টার মধ্যে জানান' },
  ],
  sections: [
    { h: { en: 'Who we are', bn: 'আমরা কারা' }, p: {
      en: 'MaaCrave is a marketplace in Dhaka that connects customers with independent, verified home cooks (“mothers”) and delivery riders. The cooks prepare the food; riders deliver it; MaaCrave runs the platform, takes payments and supports everyone.',
      bn: 'MaaCrave ঢাকার একটি মার্কেটপ্লেস, যা গ্রাহকদের যাচাই করা ঘরোয়া রাঁধুনি (মা) এবং ডেলিভারি রাইডারদের সাথে যুক্ত করে। রাঁধুনিরা খাবার রান্না করেন, রাইডাররা পৌঁছে দেন, আর MaaCrave প্ল্যাটফর্ম চালায়, পেমেন্ট নেয় ও সবাইকে সহায়তা করে।' } },
    { h: { en: 'Your account', bn: 'আপনার অ্যাকাউন্ট' }, p: {
      en: 'You sign in with a one-time code sent to your phone or email, or with Google. Keep your phone and email secure — orders placed from your account are your responsibility.',
      bn: 'ফোন বা ইমেইলে পাঠানো এককালীন কোড অথবা Google দিয়ে সাইন ইন করবেন। ফোন ও ইমেইল নিরাপদ রাখুন — আপনার অ্যাকাউন্ট থেকে দেওয়া অর্ডারের দায় আপনার।' },
      points: [
        { en: 'You must be at least 18, or use MaaCrave with a parent’s permission.', bn: 'বয়স কমপক্ষে ১৮ হতে হবে, অথবা অভিভাবকের অনুমতি নিয়ে ব্যবহার করতে হবে।' },
        { en: 'Give your real name, phone number and delivery address.', bn: 'সঠিক নাম, ফোন নম্বর ও ঠিকানা দিন।' },
        { en: 'You can delete your account any time from Account → Delete account.', bn: 'যেকোনো সময় Account → Delete account থেকে অ্যাকাউন্ট মুছে ফেলতে পারবেন।' },
      ] },
    { h: { en: 'Prices, fees and payment', bn: 'দাম, ফি ও পেমেন্ট' }, p: {
      en: 'Before you confirm, the app shows the food price, the delivery fee (based on distance), a small service fee, any discount and the total. That total is what you pay.',
      bn: 'অর্ডার নিশ্চিত করার আগে অ্যাপ খাবারের দাম, দূরত্ব অনুযায়ী ডেলিভারি ফি, ছোট সার্ভিস ফি, ছাড় এবং মোট টাকা দেখায়। ওই মোট টাকাই আপনি দেবেন।' },
      points: [
        { en: 'Online payments (bKash, cards, wallets) are processed by licensed payment providers. MaaCrave never sees your card number or PIN.', bn: 'অনলাইন পেমেন্ট (বিকাশ, কার্ড, ওয়ালেট) লাইসেন্সপ্রাপ্ত পেমেন্ট প্রতিষ্ঠান প্রসেস করে। আপনার কার্ড নম্বর বা পিন MaaCrave দেখে না।' },
        { en: 'Cash on delivery is paid to the rider when the food arrives. Please keep change ready.', bn: 'ক্যাশ অন ডেলিভারিতে খাবার পৌঁছালে রাইডারকে টাকা দিন। খুচরা রাখলে সুবিধা হয়।' },
        { en: 'Coupons have their own conditions shown when you apply them.', bn: 'কুপনের নিজস্ব শর্ত কুপন দেওয়ার সময় দেখানো হয়।' },
      ] },
    { h: { en: 'Orders, group orders and requests', bn: 'অর্ডার, গ্রুপ অর্ডার ও অনুরোধ' }, p: {
      en: 'An order is a contract between you and the cook, made through MaaCrave. Group orders start cooking only when the minimum number of portions is reached; if not, everyone is refunded. When you accept a cook’s price for a dish request, an order is created at that price.',
      bn: 'অর্ডার হলো MaaCrave-এর মাধ্যমে আপনার ও রাঁধুনির মধ্যে একটি চুক্তি। গ্রুপ অর্ডারে ন্যূনতম পরিমাণ পূর্ণ হলেই রান্না শুরু হয়; না হলে সবাই টাকা ফেরত পান। খাবারের অনুরোধে রাঁধুনির দাম গ্রহণ করলে সেই দামে অর্ডার তৈরি হয়।' } },
    { h: { en: 'Meal plans', bn: 'মিল প্ল্যান' }, p: {
      en: 'A weekly or monthly plan creates one order on each delivery day. Each meal is paid on delivery. You can pause or cancel any time from Account → Meal plans; meals already being cooked that day still count.',
      bn: 'সাপ্তাহিক বা মাসিক প্ল্যানে প্রতিটি ডেলিভারির দিনে একটি অর্ডার তৈরি হয়। প্রতি বেলার টাকা ডেলিভারির সময় দিতে হয়। Account → Meal plans থেকে যেকোনো সময় বিরতি বা বাতিল করা যায়; যে দিনের রান্না শুরু হয়ে গেছে সেটি গণ্য হবে।' } },
    { h: { en: 'Cancellations and refunds', bn: 'বাতিল ও টাকা ফেরত' }, p: {
      en: 'You can cancel for free until the cook starts cooking. After that the food is being made just for you, so cancellations aren’t possible — but if something goes wrong, we’ll make it right. See the Refund Policy for details.',
      bn: 'রাঁধুনি রান্না শুরুর আগ পর্যন্ত বিনা খরচে বাতিল করতে পারবেন। এরপর খাবারটি শুধু আপনার জন্য তৈরি হচ্ছে, তাই বাতিল করা যায় না — তবে কোনো সমস্যা হলে আমরা সমাধান করব। বিস্তারিত রিফান্ড নীতিতে আছে।' } },
    { h: { en: 'Food, allergies and safety', bn: 'খাবার, অ্যালার্জি ও নিরাপত্তা' }, p: {
      en: 'Home kitchens are verified and follow our hygiene checklist, but they are not industrial kitchens. Always mention allergies in your order notes and check the ingredients listed on each dish. Eat delivered food within a few hours.',
      bn: 'ঘরোয়া রান্নাঘর যাচাই করা এবং আমাদের পরিচ্ছন্নতার তালিকা মেনে চলে, তবে এগুলো কারখানার রান্নাঘর নয়। অ্যালার্জি থাকলে অর্ডারের নোটে অবশ্যই লিখুন এবং প্রতিটি খাবারের উপকরণ দেখে নিন। খাবার পাওয়ার কয়েক ঘণ্টার মধ্যে খেয়ে ফেলুন।' } },
    { h: { en: 'Fair use', bn: 'সঠিক ব্যবহার' }, p: {
      en: 'Please treat cooks and riders with respect. We may suspend accounts that place fake orders, refuse to pay, abuse anyone, misuse coupons or try to harm the service.',
      bn: 'রাঁধুনি ও রাইডারদের সাথে সম্মানজনক আচরণ করুন। ভুয়া অর্ডার, টাকা না দেওয়া, কারও সাথে খারাপ আচরণ, কুপনের অপব্যবহার বা সেবার ক্ষতির চেষ্টা করলে অ্যাকাউন্ট স্থগিত হতে পারে।' } },
    { h: { en: 'Our responsibility', bn: 'আমাদের দায়' }, p: {
      en: 'We work hard to keep MaaCrave running and accurate, but delivery times are estimates and the service may sometimes be unavailable. Where something is our fault, our responsibility is limited to the amount you paid for the affected order, as far as the law allows.',
      bn: 'MaaCrave সঠিকভাবে চালু রাখতে আমরা চেষ্টা করি, তবে ডেলিভারির সময় আনুমানিক এবং কখনো কখনো সেবা বন্ধ থাকতে পারে। আমাদের ভুল হলে, আইনের অনুমতি সাপেক্ষে, আমাদের দায় সংশ্লিষ্ট অর্ডারে আপনার দেওয়া টাকা পর্যন্ত সীমিত।' } },
    { h: { en: 'Changes and law', bn: 'পরিবর্তন ও আইন' }, p: {
      en: 'We may update these terms; we’ll tell you in the app before important changes take effect. These terms are governed by the laws of Bangladesh, and disputes go to the courts of Dhaka.',
      bn: 'আমরা এই শর্তাবলি হালনাগাদ করতে পারি; গুরুত্বপূর্ণ পরিবর্তনের আগে অ্যাপে জানানো হবে। এই শর্তাবলি বাংলাদেশের আইন অনুযায়ী পরিচালিত, এবং বিরোধ ঢাকার আদালতে নিষ্পত্তি হবে।' } },
  ],
};

export const PRIVACY: LegalDoc = {
  key: 'privacy', updated: UPDATED,
  title: { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },
  intro: {
    en: 'We collect only what we need to cook and deliver your food safely. We never sell your personal information.',
    bn: 'আপনার খাবার নিরাপদে রান্না ও পৌঁছে দিতে যতটুকু দরকার, শুধু ততটুকুই তথ্য নিই। আপনার ব্যক্তিগত তথ্য আমরা কখনো বিক্রি করি না।',
  },
  highlights: [
    { en: 'We never sell your data', bn: 'তথ্য কখনো বিক্রি করি না' },
    { en: 'Address shared only after pickup', bn: 'পিকআপের পরেই ঠিকানা দেখানো হয়' },
    { en: 'Delete your account any time', bn: 'যেকোনো সময় অ্যাকাউন্ট মুছুন' },
  ],
  sections: [
    { h: { en: 'What we collect', bn: 'কী তথ্য নিই' }, p: { en: 'Depending on how you use MaaCrave:', bn: 'আপনি MaaCrave কীভাবে ব্যবহার করেন তার উপর নির্ভর করে:' }, points: [
      { en: 'Account: name, phone number and/or email, preferred language.', bn: 'অ্যাকাউন্ট: নাম, ফোন নম্বর ও/বা ইমেইল, পছন্দের ভাষা।' },
      { en: 'Orders: delivery addresses and map pins, items, notes, ratings and reports.', bn: 'অর্ডার: ডেলিভারির ঠিকানা ও ম্যাপ পিন, খাবার, নোট, রেটিং ও অভিযোগ।' },
      { en: 'Payments: the result and reference of each payment from the provider — never your card number or PIN.', bn: 'পেমেন্ট: পেমেন্ট প্রতিষ্ঠান থেকে পাওয়া ফলাফল ও রেফারেন্স — কার্ড নম্বর বা পিন কখনো নয়।' },
      { en: 'Cooks and riders: identity documents, kitchen photos, licence (riders), payout number, and riders’ location while online.', bn: 'রাঁধুনি ও রাইডার: পরিচয়পত্র, রান্নাঘরের ছবি, লাইসেন্স (রাইডার), পেমেন্ট নেওয়ার নম্বর, এবং অনলাইনে থাকাকালীন রাইডারের লোকেশন।' },
      { en: 'Device: notification token and basic technical logs to keep the service secure.', bn: 'ডিভাইস: নোটিফিকেশন টোকেন ও সেবা নিরাপদ রাখতে প্রাথমিক প্রযুক্তিগত লগ।' },
    ] },
    { h: { en: 'How we use it', bn: 'কীভাবে ব্যবহার করি' }, p: {
      en: 'To create and deliver orders, take payments and refunds, verify cooks and riders, prevent fraud, answer support requests, and send updates about your orders. With your permission we may send occasional offers; you can turn them off.',
      bn: 'অর্ডার তৈরি ও পৌঁছে দেওয়া, পেমেন্ট ও রিফান্ড, রাঁধুনি ও রাইডার যাচাই, প্রতারণা ঠেকানো, সহায়তার উত্তর দেওয়া এবং অর্ডারের খবর জানাতে। আপনার অনুমতি থাকলে মাঝে মাঝে অফার পাঠাতে পারি; চাইলে বন্ধ করতে পারবেন।' } },
    { h: { en: 'Who can see what', bn: 'কে কী দেখতে পায়' }, p: { en: 'We share the minimum needed for each order:', bn: 'প্রতিটি অর্ডারের জন্য যতটুকু দরকার, শুধু ততটুকু:' }, points: [
      { en: 'The cook sees your first name, items and notes — not your phone or full address.', bn: 'রাঁধুনি দেখেন আপনার নামের প্রথম অংশ, খাবার ও নোট — ফোন বা পুরো ঠিকানা নয়।' },
      { en: 'The rider sees your address and phone only after picking up your food.', bn: 'রাইডার খাবার তোলার পরেই আপনার ঠিকানা ও ফোন দেখতে পান।' },
      { en: 'You see the rider’s location only while they are delivering your order.', bn: 'রাইডার আপনার অর্ডার পৌঁছানোর সময়েই শুধু তার লোকেশন দেখতে পাবেন।' },
      { en: 'Service providers (hosting, SMS, email, payments) process data for us under contract.', bn: 'সেবাদাতা প্রতিষ্ঠান (হোস্টিং, এসএমএস, ইমেইল, পেমেন্ট) চুক্তির অধীনে আমাদের হয়ে তথ্য প্রসেস করে।' },
      { en: 'We disclose information to authorities only when the law requires it.', bn: 'শুধু আইন অনুযায়ী বাধ্য হলেই কর্তৃপক্ষকে তথ্য দিই।' },
    ] },
    { h: { en: 'How long we keep it', bn: 'কতদিন রাখি' }, p: {
      en: 'Order and payment records are kept as long as accounting and tax law requires. Identity documents are kept while you are a partner and for a limited period after. When you delete your account, we remove or anonymise your personal details, except records we must keep by law.',
      bn: 'হিসাব ও কর আইন অনুযায়ী যতদিন দরকার, অর্ডার ও পেমেন্টের রেকর্ড ততদিন রাখা হয়। পার্টনার থাকাকালীন এবং তারপর সীমিত সময় পর্যন্ত পরিচয়পত্র রাখা হয়। অ্যাকাউন্ট মুছলে আপনার ব্যক্তিগত তথ্য মুছে বা নামহীন করে দেওয়া হয়, শুধু আইনত রাখতে হয় এমন রেকর্ড ছাড়া।' } },
    { h: { en: 'Security', bn: 'নিরাপত্তা' }, p: {
      en: 'Data travels over encrypted connections. Sign-in uses one-time codes, sessions expire, and identity documents are visible only to our verification team. No system is perfect — if we ever learn of a breach that affects you, we’ll tell you.',
      bn: 'তথ্য এনক্রিপ্টেড সংযোগে আদান-প্রদান হয়। সাইন ইনে এককালীন কোড ব্যবহার হয়, সেশনের মেয়াদ শেষ হয়, আর পরিচয়পত্র শুধু আমাদের যাচাই দল দেখতে পায়। কোনো ব্যবস্থাই নিখুঁত নয় — আপনার তথ্য ঝুঁকিতে পড়লে আমরা জানাব।' } },
    { h: { en: 'Your choices', bn: 'আপনার অধিকার' }, p: {
      en: 'You can see and edit your profile and addresses, turn off location permission, turn off notifications in your phone settings, and delete your account in the app. For a copy of your data, contact support.',
      bn: 'প্রোফাইল ও ঠিকানা দেখা ও বদলানো, লোকেশনের অনুমতি বন্ধ করা, ফোনের সেটিংসে নোটিফিকেশন বন্ধ করা এবং অ্যাপ থেকে অ্যাকাউন্ট মুছে ফেলা — সবই আপনি পারবেন। আপনার তথ্যের কপি চাইলে সাপোর্টে যোগাযোগ করুন।' } },
  ],
};

export const REFUND: LegalDoc = {
  key: 'refund', updated: UPDATED,
  title: { en: 'Refund & Cancellation Policy', bn: 'রিফান্ড ও বাতিল নীতি' },
  intro: {
    en: 'If something isn’t right with your food, tell us. Here is exactly when and how you get your money back.',
    bn: 'খাবারে কোনো সমস্যা হলে আমাদের জানান। কখন ও কীভাবে টাকা ফেরত পাবেন, তা এখানে পরিষ্কার করে লেখা আছে।',
  },
  highlights: [
    { en: 'Online refunds: 3–7 working days', bn: 'অনলাইন রিফান্ড: ৩–৭ কর্মদিবস' },
    { en: 'Cash orders: refund to your bKash', bn: 'ক্যাশ অর্ডার: বিকাশে ফেরত' },
    { en: 'Report within 24 hours', bn: '২৪ ঘণ্টার মধ্যে জানান' },
  ],
  sections: [
    { h: { en: 'Cancelling an order', bn: 'অর্ডার বাতিল' }, p: { en: 'When you can cancel:', bn: 'কখন বাতিল করা যায়:' }, points: [
      { en: 'Before the cook starts cooking: cancel free from the order screen. Online payments are refunded in full.', bn: 'রান্না শুরুর আগে: অর্ডার পাতা থেকে বিনা খরচে বাতিল। অনলাইন পেমেন্ট পুরো ফেরত।' },
      { en: 'After cooking starts: the order can’t be cancelled, because it is being made just for you.', bn: 'রান্না শুরুর পরে: বাতিল করা যায় না, কারণ খাবারটি শুধু আপনার জন্য তৈরি হচ্ছে।' },
      { en: 'If the cook declines or can’t make it, or a group order doesn’t fill, you get a full refund automatically.', bn: 'রাঁধুনি অর্ডার নিতে না পারলে বা গ্রুপ অর্ডার পূর্ণ না হলে নিজে থেকেই পুরো টাকা ফেরত।' },
    ] },
    { h: { en: 'When you get a refund', bn: 'কখন টাকা ফেরত পাবেন' }, p: { en: 'Report the problem from the order screen within 24 hours of delivery. Photos help us act faster.', bn: 'ডেলিভারির ২৪ ঘণ্টার মধ্যে অর্ডার পাতা থেকে সমস্যা জানান। ছবি দিলে দ্রুত সমাধান হয়।' }, points: [
      { en: 'Order never arrived — full refund.', bn: 'অর্ডার পৌঁছায়নি — পুরো টাকা ফেরত।' },
      { en: 'Wrong or missing items — refund for those items, or the full order if it can’t be eaten.', bn: 'ভুল বা কম খাবার — ওই অংশের টাকা, খাওয়ার অযোগ্য হলে পুরো টাকা।' },
      { en: 'Spoiled, unsafe or seriously poor quality food — full or partial refund after review.', bn: 'নষ্ট, অনিরাপদ বা খুব খারাপ মানের খাবার — যাচাইয়ের পর পুরো বা আংশিক ফেরত।' },
      { en: 'Very late delivery (over 45 minutes past the estimate, not caused by you) — delivery fee refunded.', bn: 'অনেক দেরি (আনুমানিক সময়ের ৪৫ মিনিটের বেশি, আপনার কারণে নয়) — ডেলিভারি ফি ফেরত।' },
    ] },
    { h: { en: 'How the money comes back', bn: 'টাকা কীভাবে ফেরত আসে' }, p: { en: 'We refund to where the money came from:', bn: 'যেখান থেকে টাকা এসেছিল, সেখানেই ফেরত দিই:' }, points: [
      { en: 'bKash: back to the same bKash account, usually within 3 working days.', bn: 'বিকাশ: একই বিকাশ অ্যাকাউন্টে, সাধারণত ৩ কর্মদিবসের মধ্যে।' },
      { en: 'Cards and other wallets: back to the same card or wallet in 7–10 working days, depending on your bank.', bn: 'কার্ড ও অন্যান্য ওয়ালেট: একই কার্ড বা ওয়ালেটে ৭–১০ কর্মদিবসে, ব্যাংকের উপর নির্ভর করে।' },
      { en: 'Cash on delivery: sent to your bKash number within 3 working days after we approve it.', bn: 'ক্যাশ অন ডেলিভারি: অনুমোদনের পর ৩ কর্মদিবসের মধ্যে আপনার বিকাশ নম্বরে।' },
    ] },
    { h: { en: 'What isn’t refundable', bn: 'যা ফেরতযোগ্য নয়' }, p: {
      en: 'Taste preferences when the dish was made as described, problems reported more than 24 hours after delivery, orders where the address or phone was wrong and the rider couldn’t reach you, and food left uneaten for many hours.',
      bn: 'বর্ণনা অনুযায়ী রান্না হলেও স্বাদ পছন্দ না হওয়া, ডেলিভারির ২৪ ঘণ্টা পরে জানানো সমস্যা, ভুল ঠিকানা বা ফোনের কারণে রাইডার পৌঁছাতে না পারা, এবং অনেক ঘণ্টা ফেলে রাখা খাবার।' } },
    { h: { en: 'Who pays for a refund', bn: 'রিফান্ডের খরচ কে দেয়' }, p: {
      en: 'If the problem was the cook’s (wrong, missing or spoiled food), the refunded food amount is deducted from the cook’s earnings. If it was the rider’s (lost or damaged in delivery), it may be deducted from the rider’s earnings. If it was ours, MaaCrave pays.',
      bn: 'রাঁধুনির ভুলে (ভুল, কম বা নষ্ট খাবার) ফেরত দেওয়া খাবারের টাকা রাঁধুনির আয় থেকে কাটা হয়। রাইডারের ভুলে (হারানো বা নষ্ট) রাইডারের আয় থেকে কাটা হতে পারে। আমাদের ভুল হলে MaaCrave দেয়।' } },
  ],
};

export const COOK_TERMS: LegalDoc = {
  key: 'cook-terms', updated: UPDATED,
  title: { en: 'Cook Partner Terms', bn: 'রাঁধুনি পার্টনার শর্তাবলি' },
  intro: {
    en: 'The agreement between you, as an independent home cook, and MaaCrave. Your current rates are always shown in the app under Rates & terms.',
    bn: 'স্বাধীন ঘরোয়া রাঁধুনি হিসেবে আপনার ও MaaCrave-এর মধ্যকার চুক্তি। আপনার বর্তমান রেট সবসময় অ্যাপের Rates & terms-এ দেখা যায়।',
  },
  highlights: [
    { en: 'You keep most of every sale', bn: 'বিক্রির বেশিরভাগ আপনার' },
    { en: 'Weekly payouts to bKash', bn: 'সাপ্তাহিক বিকাশে পেমেন্ট' },
    { en: 'You set your own prices and hours', bn: 'দাম ও সময় আপনিই ঠিক করেন' },
  ],
  sections: [
    { h: { en: 'Your relationship with MaaCrave', bn: 'MaaCrave-এর সাথে সম্পর্ক' }, p: {
      en: 'You are an independent seller, not an employee. You choose what to cook, your prices, your hours and how many orders to take. MaaCrave provides the app, customers, payments, delivery and support.',
      bn: 'আপনি একজন স্বাধীন বিক্রেতা, কর্মচারী নন। কী রাঁধবেন, দাম, সময় এবং কতগুলো অর্ডার নেবেন — সব আপনিই ঠিক করেন। MaaCrave দেয় অ্যাপ, গ্রাহক, পেমেন্ট, ডেলিভারি ও সহায়তা।' } },
    { h: { en: 'Commission and what you earn', bn: 'কমিশন ও আপনার আয়' }, p: {
      en: 'MaaCrave keeps a commission on the food price of each delivered order. You receive the rest. The delivery fee and service fee are paid by the customer and are not taken from you.',
      bn: 'প্রতিটি ডেলিভারি হওয়া অর্ডারের খাবারের দাম থেকে MaaCrave একটি কমিশন রাখে, বাকিটা আপনার। ডেলিভারি ফি ও সার্ভিস ফি গ্রাহক দেন — আপনার কাছ থেকে নেওয়া হয় না।' },
      points: [
        { en: 'Example at 12%: a ৳200 order → MaaCrave ৳24, you ৳176.', bn: 'উদাহরণ (১২%): ৳২০০ অর্ডার → MaaCrave ৳২৪, আপনি ৳১৭৬।' },
        { en: 'Every order in the app shows the price, the commission and what you get.', bn: 'অ্যাপে প্রতিটি অর্ডারে দাম, কমিশন ও আপনার প্রাপ্য দেখানো হয়।' },
        { en: 'If rates change, you’ll be told in advance and asked to accept them before taking new orders.', bn: 'রেট বদলালে আগে জানানো হবে, এবং নতুন অর্ডার নেওয়ার আগে গ্রহণ করতে হবে।' },
      ] },
    { h: { en: 'Payouts', bn: 'পেমেন্ট' }, p: {
      en: 'Your available balance can be withdrawn to your bKash number from Earnings. Requests are processed within 3 working days. Refunds caused by your food (see below) are deducted from your balance.',
      bn: 'Earnings থেকে আপনার জমা টাকা বিকাশ নম্বরে তুলতে পারবেন। অনুরোধ ৩ কর্মদিবসের মধ্যে প্রসেস হয়। আপনার খাবারের কারণে দেওয়া রিফান্ড (নিচে দেখুন) আপনার জমা থেকে কাটা হয়।' } },
    { h: { en: 'Food safety and hygiene', bn: 'খাদ্য নিরাপত্তা ও পরিচ্ছন্নতা' }, p: { en: 'You are responsible for the food you cook. You agree to:', bn: 'আপনার রান্না করা খাবারের দায় আপনার। আপনি মেনে চলবেন:' }, points: [
      { en: 'Cook in a clean kitchen with safe water, and keep raw and cooked food apart.', bn: 'পরিষ্কার রান্নাঘরে নিরাপদ পানি দিয়ে রান্না, কাঁচা ও রান্না খাবার আলাদা রাখা।' },
      { en: 'List ingredients and allergens honestly, and follow customers’ notes.', bn: 'উপকরণ ও অ্যালার্জেন সঠিকভাবে লেখা, এবং গ্রাহকের নোট মেনে চলা।' },
      { en: 'Pack food sealed and food-safe; never send leftover or reheated food as fresh.', bn: 'খাবার সিল করা ও নিরাপদ প্যাকেটে দেওয়া; বাসি বা গরম করা খাবার তাজা বলে না পাঠানো।' },
      { en: 'Allow MaaCrave to check your kitchen (photo or visit) when asked.', bn: 'চাইলে MaaCrave-কে রান্নাঘর দেখতে দেওয়া (ছবি বা সরেজমিনে)।' },
      { en: 'Follow the food safety rules that apply in Bangladesh.', bn: 'বাংলাদেশে প্রযোজ্য খাদ্য নিরাপত্তা নিয়ম মেনে চলা।' },
    ] },
    { h: { en: 'Accepting and completing orders', bn: 'অর্ডার গ্রহণ ও সম্পন্ন করা' }, p: {
      en: 'Accept only what you can cook on time. Mark food ready only when it is packed. Turning off “Accepting orders” when you’re busy is better than declining — frequent declines or late food lower your ranking and may pause your kitchen.',
      bn: 'যতটুকু সময়মতো রাঁধতে পারবেন, ততটুকুই নিন। প্যাক হলে তবেই ‘রেডি’ দিন। ব্যস্ত থাকলে অর্ডার বাতিলের চেয়ে ‘Accepting orders’ বন্ধ রাখা ভালো — বারবার বাতিল বা দেরি হলে র‍্যাংকিং কমে এবং রান্নাঘর সাময়িক বন্ধ হতে পারে।' } },
    { h: { en: 'Refunds caused by your food', bn: 'আপনার খাবারের কারণে রিফান্ড' }, p: {
      en: 'If a customer is refunded because food was wrong, missing, spoiled or unsafe, the refunded food amount is deducted from your earnings. You can see the report and reply through Support.',
      bn: 'খাবার ভুল, কম, নষ্ট বা অনিরাপদ হওয়ায় গ্রাহককে টাকা ফেরত দিলে সেই খাবারের টাকা আপনার আয় থেকে কাটা হয়। অভিযোগটি দেখে Support-এর মাধ্যমে উত্তর দিতে পারবেন।' } },
    { h: { en: 'Suspension and leaving', bn: 'স্থগিত ও চলে যাওয়া' }, p: {
      en: 'We may pause or end a kitchen for food-safety risks, fraud, repeated serious complaints or abuse — we’ll explain why. You can stop any time; your remaining balance is paid out after open orders and reports are settled.',
      bn: 'খাদ্য নিরাপত্তার ঝুঁকি, প্রতারণা, বারবার গুরুতর অভিযোগ বা খারাপ আচরণের জন্য রান্নাঘর বন্ধ হতে পারে — কারণ জানানো হবে। আপনি যেকোনো সময় ছেড়ে যেতে পারবেন; চলমান অর্ডার ও অভিযোগ মিটে গেলে বাকি টাকা দিয়ে দেওয়া হবে।' } },
  ],
};

export const RIDER_TERMS: LegalDoc = {
  key: 'rider-terms', updated: UPDATED,
  title: { en: 'Rider Partner Terms', bn: 'রাইডার পার্টনার শর্তাবলি' },
  intro: {
    en: 'The agreement between you, as an independent delivery rider, and MaaCrave. Your current pay rates are always shown in the app under Rates & terms.',
    bn: 'স্বাধীন ডেলিভারি রাইডার হিসেবে আপনার ও MaaCrave-এর মধ্যকার চুক্তি। আপনার বর্তমান পারিশ্রমিক সবসময় অ্যাপের Rates & terms-এ দেখা যায়।',
  },
  highlights: [
    { en: 'Paid per drop, more for distance', bn: 'প্রতি ডেলিভারিতে আয়, দূরত্বে বেশি' },
    { en: 'Go online whenever you want', bn: 'যখন খুশি অনলাইনে যান' },
    { en: '100% of tips are yours', bn: 'টিপসের পুরোটাই আপনার' },
  ],
  sections: [
    { h: { en: 'Your relationship with MaaCrave', bn: 'MaaCrave-এর সাথে সম্পর্ক' }, p: {
      en: 'You are an independent partner, not an employee. You decide when to go online and which trips to accept. You provide and maintain your own vehicle, phone and data.',
      bn: 'আপনি একজন স্বাধীন পার্টনার, কর্মচারী নন। কখন অনলাইনে যাবেন এবং কোন ট্রিপ নেবেন — আপনিই ঠিক করেন। নিজের বাহন, ফোন ও ইন্টারনেট আপনার।' } },
    { h: { en: 'How you are paid', bn: 'কীভাবে আয় করবেন' }, p: {
      en: 'For every delivered drop you earn a base amount plus an amount for each kilometre from the kitchen to the customer. Group-order drops on the same route use a smaller base, because you deliver several at once. The amount is shown before you accept.',
      bn: 'প্রতিটি সফল ডেলিভারিতে একটি মূল টাকা এবং রান্নাঘর থেকে গ্রাহক পর্যন্ত প্রতি কিলোমিটারের জন্য বাড়তি টাকা পাবেন। একই রুটে একসাথে কয়েকটি গ্রুপ অর্ডার পৌঁছালে প্রতিটির মূল টাকা কিছুটা কম। ট্রিপ নেওয়ার আগেই টাকা দেখানো হয়।' },
      points: [
        { en: 'Example: base ৳25 + ৳6/km. A 4 km trip pays ৳49.', bn: 'উদাহরণ: মূল ৳২৫ + প্রতি কিমি ৳৬। ৪ কিমির ট্রিপে ৳৪৯।' },
        { en: 'Tips from customers are 100% yours.', bn: 'গ্রাহকের দেওয়া টিপসের পুরোটাই আপনার।' },
        { en: 'If rates change, you’ll be told in advance and asked to accept them before going online.', bn: 'রেট বদলালে আগে জানানো হবে, এবং অনলাইনে যাওয়ার আগে গ্রহণ করতে হবে।' },
      ] },
    { h: { en: 'Cash on delivery', bn: 'ক্যাশ অন ডেলিভারি' }, p: {
      en: 'Cash you collect from customers belongs to MaaCrave until you hand it in. You can hold up to the cash limit shown in the app; above it you can’t take new cash orders until you deposit. Your earnings and the cash you hold are settled against each other at settlement.',
      bn: 'গ্রাহকের কাছ থেকে নেওয়া নগদ টাকা জমা না দেওয়া পর্যন্ত MaaCrave-এর। অ্যাপে দেখানো সীমা পর্যন্ত নগদ রাখতে পারবেন; সীমা পেরোলে জমা না দেওয়া পর্যন্ত নতুন ক্যাশ অর্ডার নেওয়া যাবে না। সেটেলমেন্টের সময় আপনার আয় ও আপনার কাছে থাকা নগদ মিলিয়ে হিসাব হয়।' } },
    { h: { en: 'Settlement', bn: 'সেটেলমেন্ট' }, p: {
      en: 'Earnings are settled weekly to your bKash. Earnings shows your cash in hand, unpaid earnings and the balance at all times. Every deposit and payout is recorded with a reference.',
      bn: 'আয় প্রতি সপ্তাহে বিকাশে দেওয়া হয়। Earnings পাতায় সবসময় আপনার কাছে থাকা নগদ, বাকি আয় ও ব্যালেন্স দেখা যায়। প্রতিটি জমা ও পেমেন্ট রেফারেন্সসহ রেকর্ড থাকে।' } },
    { h: { en: 'Safety and conduct', bn: 'নিরাপত্তা ও আচরণ' }, p: { en: 'You agree to:', bn: 'আপনি মেনে চলবেন:' }, points: [
      { en: 'Hold a valid licence and registration for a motor vehicle, wear a helmet and follow traffic law.', bn: 'মোটরযানের বৈধ লাইসেন্স ও রেজিস্ট্রেশন রাখা, হেলমেট পরা ও ট্রাফিক আইন মানা।' },
      { en: 'Keep food sealed, upright and covered; never open a package.', bn: 'খাবার সিল করা, সোজা ও ঢাকা রাখা; কখনো প্যাকেট না খোলা।' },
      { en: 'Hand food over only with the customer’s 4-digit code.', bn: 'গ্রাহকের ৪ সংখ্যার কোড নিয়েই খাবার হস্তান্তর করা।' },
      { en: 'Use customers’ phone and address only for that delivery.', bn: 'গ্রাহকের ফোন ও ঠিকানা শুধু সেই ডেলিভারির জন্য ব্যবহার করা।' },
      { en: 'Share your location while online so the nearest rider gets each pickup and customers can track their food.', bn: 'অনলাইনে থাকাকালীন লোকেশন শেয়ার করা, যাতে কাছের রাইডার পিকআপ পান এবং গ্রাহক খাবার ট্র্যাক করতে পারেন।' },
    ] },
    { h: { en: 'Lost or damaged food', bn: 'হারানো বা নষ্ট খাবার' }, p: {
      en: 'If food is lost or damaged because of careless handling, the refund may be deducted from your earnings after review. Accidents and situations outside your control are not deducted.',
      bn: 'অসাবধানতায় খাবার হারালে বা নষ্ট হলে যাচাইয়ের পর রিফান্ডের টাকা আপনার আয় থেকে কাটা হতে পারে। দুর্ঘটনা বা আপনার নিয়ন্ত্রণের বাইরের ঘটনায় কাটা হবে না।' } },
    { h: { en: 'Suspension and leaving', bn: 'স্থগিত ও চলে যাওয়া' }, p: {
      en: 'We may pause or end your account for unsafe riding, keeping customer cash, fraud or abuse — we’ll explain why. You can stop any time; after you hand in any cash, your remaining earnings are paid out.',
      bn: 'অনিরাপদ চালানো, গ্রাহকের টাকা জমা না দেওয়া, প্রতারণা বা খারাপ আচরণের জন্য অ্যাকাউন্ট বন্ধ হতে পারে — কারণ জানানো হবে। আপনি যেকোনো সময় ছেড়ে যেতে পারবেন; হাতে থাকা নগদ জমা দিলে বাকি আয় দিয়ে দেওয়া হবে।' } },
  ],
};

export const LEGAL_DOCS: Record<string, LegalDoc> = { terms: TERMS, privacy: PRIVACY, refund: REFUND, 'cook-terms': COOK_TERMS, 'rider-terms': RIDER_TERMS };
