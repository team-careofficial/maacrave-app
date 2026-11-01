import { Coupon, PlatformSetting } from '@prisma/client';

export interface Fees {
  subtotal: number; serviceFee: number; deliveryFee: number; discount: number; total: number;
  commission: number; cookEarning: number; riderPayout: number; couponCode: string | null;
}

export function couponDiscount(coupon: Coupon | null | undefined, subtotal: number, isBatch: boolean): { amount: number; error?: string } {
  if (!coupon) return { amount: 0 };
  if (!coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) return { amount: 0, error: 'This code has expired.' };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { amount: 0, error: 'This code has been fully used.' };
  if (coupon.batchOnly && !isBatch) return { amount: 0, error: `${coupon.code} works on group orders only.` };
  if (subtotal < coupon.minOrder) return { amount: 0, error: `Add ৳${coupon.minOrder - subtotal} more to use ${coupon.code}.` };
  const raw = coupon.type === 'PERCENT' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  return { amount: Math.min(raw, coupon.maxDiscount, subtotal) };
}

/** Single source of truth for order money. All values are whole taka. */
export function computeFees(subtotal: number, isBatch: boolean, s: PlatformSetting, coupon?: Coupon | null): Fees {
  const discount = couponDiscount(coupon, subtotal, isBatch).amount;
  const serviceFee = s.serviceFee;
  const deliveryFee = isBatch ? s.batchDeliveryFee : s.deliveryFee;
  const commission = Math.round((subtotal * s.commissionPct) / 100);
  return {
    subtotal, serviceFee, deliveryFee, discount,
    total: subtotal + serviceFee + deliveryFee - discount,
    commission, cookEarning: subtotal - commission, riderPayout: s.riderPayout,
    couponCode: discount > 0 && coupon ? coupon.code : null,
  };
}
