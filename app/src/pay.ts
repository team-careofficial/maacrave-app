import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export const CLIENT: 'app' | 'web' = Platform.OS === 'web' ? 'web' : 'app';

/**
 * Sends the customer to bKash / SSLCommerz. The server confirms the money with the gateway
 * and redirects to /payment-result; the app never decides on its own that an order is paid.
 */
export async function openPayment(url: string, orderId: string) {
  if (Platform.OS === 'web') { window.location.assign(url); return; }
  const r = await WebBrowser.openAuthSessionAsync(url, Linking.createURL('payment-result'));
  if (r.type === 'success' && r.url) {
    const { queryParams } = Linking.parse(r.url);
    router.replace({ pathname: '/payment-result', params: { status: String(queryParams?.status || ''), orderId: String(queryParams?.orderId || orderId) } });
  } else {
    router.replace(`/order/${orderId}`);
  }
}
