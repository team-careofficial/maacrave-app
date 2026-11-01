import type { OrderStatus } from './types';

export const tk = (n: number) => '৳' + Math.round(n).toLocaleString('en-IN');
export const firstName = (n?: string | null) => (n || '').split(' ')[0];
export const clock = (d: string | Date) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const day = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export function ago(d: string | Date) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
export function countdown(to: string | Date) {
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m} min`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Waiting for payment', SUBMITTED: 'Order placed', COOK_ACCEPTED: 'Cook accepted', CONFIRMED: 'Confirmed',
  PREPARING: 'Being cooked', READY: 'Ready for pickup', RIDER_ASSIGNED: 'Rider assigned', PICKED_UP: 'Picked up', ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};
export const TIMELINE: OrderStatus[] = ['SUBMITTED', 'CONFIRMED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];
export const ACTIVE_STATUSES: OrderStatus[] = ['AWAITING_PAYMENT', 'SUBMITTED', 'COOK_ACCEPTED', 'CONFIRMED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'];
export const statusTone = (s: OrderStatus) => (s === 'CANCELLED' ? 'err' : s === 'DELIVERED' ? 'ok' : s === 'AWAITING_PAYMENT' ? 'warn' : 'brand') as 'err' | 'ok' | 'warn' | 'brand';
export const BD_PHONE = /^01[3-9]\d{8}$/;
export function normalizePhone(input: string) {
  let p = input.replace(/[\s-]/g, '').replace(/^\+?88/, '');
  if (/^1[3-9]\d{8}$/.test(p)) p = '0' + p;
  return p;
}
