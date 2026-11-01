# MaaCrave

Homemade food from verified mothers. Customers order dishes cooking today, **request any dish** and get prices from cooks nearby, or **join group orders** for cheaper delivery. Cooks run their kitchen from the same app; riders deliver.

```
maacrave-app/
├── app/       Expo (React Native + TypeScript) — Android, iOS and the website from one codebase
├── backend/   NestJS + Prisma + PostgreSQL API — the only thing that touches the database
└── docker-compose.yml   local PostgreSQL
```

> **Bangla summary:** `backend` হলো সার্ভার (NestJS + PostgreSQL), `app` হলো মোবাইল অ্যাপ + ওয়েবসাইট (Expo)। অ্যাপ কখনো সরাসরি ডাটাবেসে যায় না — সব কিছু API দিয়ে। Admin প্যানেল অ্যাপে নেই; cook/rider approve করা হয় ভিতর থেকে (নিচে দেখুন)।

---

## 1. Run it on your computer

Requirements: Node.js 20+, Docker (or any PostgreSQL 14+), and the Expo Go app on your phone.

```bash
# 1) Database
docker compose up -d db

# 2) API
cd backend
cp .env.example .env            # fill JWT_SECRET and OTP_SECRET: openssl rand -hex 32
npm install
npx prisma db push               # creates / updates the tables
npm run seed                    # platform settings + 2 coupons, no fake data
npm run start:dev               # http://localhost:4000/v1/health

# 3) App (new terminal)
cd app
cp .env.example .env            # EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:4000/v1 for a phone
npm install
npx expo install --fix          # aligns native package versions with the Expo SDK
npx expo start                  # scan the QR code with Expo Go; press w for the website
```

With `SMS_PROVIDER=log` and `EMAIL_PROVIDER=log` (development only) the sign-in code is printed in the API terminal instead of being sent by SMS or email.

People can sign in with a **mobile number** (code by SMS) or **Gmail / any email** (code by email). Codes expire after 5 minutes. Email-only users are asked for a mobile number at profile setup so riders can call them.

## 2. Verifying cooks and riders (no admin screen in the app)

There is deliberately **no admin sign-in in the app or website**. People apply from *Account → Cook with MaaCrave / Ride with MaaCrave*; their role stays `PENDING` until your team approves it after the NID call / kitchen check:

```bash
cd backend && npx prisma studio      # open UserRole, set status = APPROVED (or REJECTED)
```

or with SQL:

```sql
UPDATE "UserRole" SET status = 'APPROVED'
WHERE role = 'COOK' AND "userId" = (SELECT id FROM "User" WHERE phone = '01XXXXXXXXX');
```

The same way your team handles payouts (`Payout`), complaints and refunds (`Complaint`), coupons (`Coupon`) and fees (`PlatformSetting`). Run Prisma Studio only on a trusted machine against production — never expose it publicly. A separate internal admin web tool can be built later on top of the same API with `@Roles('ADMIN')`.

## 3. Going live — what you need to provide

| Needed | Where it goes | Notes |
|---|---|---|
| PostgreSQL database | `DATABASE_URL` | Neon, Supabase, Railway, AWS RDS… turn on daily backups |
| API hosting | `render.yaml` (Render Blueprint) or `backend/Dockerfile` | Render, Railway, Fly.io, a VPS |
| Domain + HTTPS | `API_PUBLIC_URL`, `CORS_ORIGINS`, `WEB_RETURN_URL` | e.g. `api.maacrave.app` and `maacrave.app` |
| SMS gateway for OTP | `SMS_PROVIDER=bulksmsbd`, `BULKSMSBD_*` | BulkSMSBD account + approved sender ID |
| Email for OTP | `EMAIL_PROVIDER=smtp` + `SMTP_USER`/`SMTP_PASS` (Gmail App password), or `EMAIL_PROVIDER=brevo` + `BREVO_API_KEY` | Use Brevo on Render's free plan — it blocks SMTP ports |
| bKash merchant | `BKASH_*` | Apply for bKash Tokenized Checkout; test on sandbox first, then switch `BKASH_BASE_URL` to live |
| SSLCommerz store (cards, Nagad, Rocket) | `SSLCZ_*` | Sandbox first, then live store + `SSLCZ_BASE_URL=https://securepay.sslcommerz.com` |
| Expo account | `app.json → extra.eas.projectId` | `npx eas init` fills it in |
| Google Play developer account | — | one-time US$25 |
| Apple developer account | — | US$99/year, needed for the App Store |
| Privacy policy page | `https://maacrave.app/privacy` | required by both stores (linked from Account) |

Payment methods the server isn't configured for show as “Coming soon” in checkout, so you can launch with cash on delivery first.

## 4. Build and publish

```bash
cd app
npm i -g eas-cli && eas login && eas init
eas build -p android --profile production   # .aab for Google Play
eas build -p ios --profile production       # for the App Store
eas submit -p android && eas submit -p ios
npm run build:web                            # website → dist/ ; host on Vercel, Netlify or Cloudflare Pages
```

Set the production API URL in `app/eas.json` (`EXPO_PUBLIC_API_URL`) and in your web host's environment before building.

## 5. How the important parts work

- **Sign-in:** phone + 6-digit SMS code. Codes are hashed, expire in 5 minutes, max 5 attempts, rate-limited. Access tokens last 15 minutes; refresh tokens rotate and are stored hashed. On phones tokens live in the secure keychain/keystore.
- **Payments:** the app never marks anything paid. bKash/SSLCommerz redirect back to the API, which re-checks the transaction with the gateway and the amount before confirming. Unpaid online orders auto-cancel after 20 minutes. Cancellations and declines refund automatically.
- **Group orders:** seat counting is done inside a database transaction with a row lock, so a batch can't be oversold. If the minimum isn't reached by the cut-off, every order is cancelled and refunded.
- **Delivery code:** each order has a 4-digit code only the customer sees. The rider must enter it to complete delivery (rate-limited). Cooks never see it, and riders only see the customer's address and phone after pickup.
- **Order flow:** `AWAITING_PAYMENT → SUBMITTED → CONFIRMED → PREPARING → READY → RIDER_ASSIGNED → PICKED_UP → ON_THE_WAY → DELIVERED` (or `CANCELLED`). Push notifications go out at each step.
- **Fees** (editable in `PlatformSetting`): 10% commission from the cook, ৳12 service fee, ৳45 delivery (৳25 for group orders), ৳35 rider payout per drop.

## 6. Before you launch — checklist

- [ ] `npm install` and `npm run typecheck` in both `app/` and `backend/` pass
- [ ] Full test on a real Android and iPhone: sign in, add address, order with cash, request → proposal → accept, join a group order, cook flow, rider flow with delivery code
- [ ] bKash and SSLCommerz sandbox payments succeed **and** fail correctly, then switch to live keys
- [ ] Real SMS arrives within seconds
- [ ] Production `.env` has strong secrets, `NODE_ENV=production`, correct `CORS_ORIGINS`
- [ ] Database backups on; error monitoring (e.g. Sentry) added
- [ ] Privacy policy and terms published; trade licence / food-business permissions in place
