# MaaCrave API

NestJS 10 + Prisma 5 + PostgreSQL. All routes are under `/v1` except payment gateway callbacks (`/payments/...`). See the root README for setup and deployment.

Modules: `auth` (OTP, JWT, refresh) · `users` (profile, addresses, applications, favourites) · `catalog` (dishes, cooks, meta) · `batches` · `requests` · `orders` (checkout, payments, reviews, complaints) · `kitchen` (cook mode) · `rider` · `notifications` (in-app + Expo push) · `jobs` (batch cut-offs, unpaid-order expiry, request expiry).
