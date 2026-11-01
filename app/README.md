# MaaCrave app (Android · iOS · Web)

Expo SDK 52 + Expo Router + TypeScript. See the root README for full setup.

```
app/                 screens (file-based routes)
  (auth)/            sign-in, OTP, profile setup
  (tabs)/            customer: Home, Browse, Request, Orders, Account
  dish/ cook/ batch/ request/ order/ apply/   detail and flow screens
  cart, checkout, addresses, favorites, notifications, payment-result
  kitchen/           Mother/Cook mode (approved cooks only)
  rider/             Rider mode (approved riders only)
src/
  api.ts             typed API client, token refresh
  auth.tsx cart.tsx  app state
  theme.ts           colours, spacing, type scale — change the look here
  ui/                shared components (cards, buttons, inputs, tabs)
```

Commands: `npx expo start` · `npm run typecheck` · `npm run build:web` · `eas build`.
