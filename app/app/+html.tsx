import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Web-only document shell (website build). */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>MaaCrave — Homemade food from verified mothers</title>
        <meta name="description" content="Order fresh homemade meals from verified home cooks in Dhaka. Request any dish, join group orders and pay with bKash, card or cash." />
        <meta name="theme-color" content="#FFFFFF" />
        <meta property="og:title" content="MaaCrave — Homemade food from verified mothers" />
        <meta property="og:description" content="Fresh home cooking from verified mothers near you in Dhaka." />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'html,body{background:#FFFFFF;-webkit-font-smoothing:antialiased}' }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
