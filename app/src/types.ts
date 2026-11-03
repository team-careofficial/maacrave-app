export type Role = 'CUSTOMER' | 'COOK' | 'RIDER' | 'ADMIN';
export type RoleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type OrderStatus = 'AWAITING_PAYMENT' | 'SUBMITTED' | 'COOK_ACCEPTED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'RIDER_ASSIGNED' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
export type BatchStatus = 'OPEN' | 'FULL' | 'CONFIRMED' | 'COOKING' | 'READY' | 'DONE' | 'FAILED';
export type PaymentMethod = 'BKASH' | 'SSLCOMMERZ' | 'COD';

export interface CookPublic { id: string; displayName: string; area: string; intro: string; specialties: string[]; rating: number; ratingCount: number; completedOrders: number; hours: string; accepting: boolean; lat?: number | null; lng?: number | null }
export interface Kitchen extends CookPublic { dailyCapacity: number; hygieneChecks: number; payoutWallet: string | null; kitchenInfo: string | null; experience: string | null }
export interface Me {
  id: string; phone: string | null; email: string | null; name: string | null; area: string | null; language: 'en' | 'bn'; loyaltyPoints: number; referralCode: string | null;
  roles: { role: Role; status: RoleStatus; note?: string | null }[]; cook: Kitchen | null; rider: { id: string; vehicle: string; online: boolean } | null;
}
export interface Dish {
  id: string; cookId: string; name: string; nameBn: string | null; category: string; price: number; portion: string; prepMinutes: number;
  ingredients: string[]; allergens: string[]; description: string; spice: number; dailyCapacity: number; available: boolean; rating: number; ratingCount: number; orderCount: number;
  cook?: CookPublic;
}
export interface Review { id: string; stars: number; text: string | null; createdAt: string; user: { name: string }; dish?: { name: string } | null }
export interface Batch {
  id: string; cookId: string; dishId: string | null; title: string; pricePerPortion: number; minPortions: number; maxPortions: number; cutoffAt: string; readyBy: string; area: string;
  status: BatchStatus; filled: number; participants: number; myOrderId: string | null; myPortions: number; cook?: CookPublic; dish?: Dish | null; who?: { name: string; portions: number }[];
}
export interface DishDetail extends Dish { reviews: Review[]; openBatch: Batch | null }
export interface CookDetail extends CookPublic { dishes: Dish[]; reviews: Review[]; openBatches: Batch[] }
export interface Address { id: string; label: string; area: string; road: string; house: string; floor: string | null; landmark: string | null; isDefault: boolean; lat?: number | null; lng?: number | null }
export interface Fees { subtotal: number; serviceFee: number; deliveryFee: number; discount: number; total: number; couponCode: string | null; distanceKm?: number; tip?: number }
export interface OrderItem { id: string; dishId: string | null; name: string; unitPrice: number; quantity: number }
export interface Order {
  id: string; code: string; status: OrderStatus; customerId: string; cookId: string; batchId: string | null; requestId: string | null;
  subtotal: number; serviceFee: number; deliveryFee: number; discount: number; total: number; commission: number; cookEarning: number; riderPayout?: number; tip?: number; couponCode: string | null;
  addressText: string; area: string; lat?: number | null; lng?: number | null; deliveryOtp?: string; notes: string | null; createdAt: string; updatedAt: string;
  items: OrderItem[]; events: { id: string; status: OrderStatus; createdAt: string }[];
  payment: { method: PaymentMethod; status: string; amount: number } | null; review: { stars: number } | null;
  cook: { id: string; displayName: string; area: string; lat?: number | null; lng?: number | null }; rider: { id: string; name: string | null } | null; batch: { id: string; title: string; readyBy: string; status: BatchStatus } | null;
  customer?: { name: string | null };
  distanceKm?: number | null;
  tracking?: { lat: number | null; lng: number | null; locatedAt: string | null; phone: string | null; vehicle: string } | null;
}
export interface Proposal { id: string; pricePerPortion: number; note: string | null; status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; cook: { id: string; displayName: string; area: string; rating: number; ratingCount: number } }
export interface FoodRequest {
  id: string; dishName: string; category: string; portions: number; budgetPerPortion: number; neededAt: string; area: string; spice: string; oil: string; diet: string[];
  exclusions: string | null; allergies: string | null; notes: string | null; allowGroup: boolean; status: 'OPEN' | 'PROPOSALS' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED'; createdAt: string;
  proposals: Proposal[]; order: { id: string; code: string; status: OrderStatus } | null; customer?: { name: string };
}
export interface Notification { id: string; title: string; body: string; read: boolean; createdAt: string }
export interface Meta { categories: string[]; areas: string[]; fees: { serviceFee: number; deliveryFee: number; batchDeliveryFee: number; commissionPct: number }; coupons: { code: string; description: string }[]; payments: { bkash: boolean; card: boolean; cod: boolean } }
export interface KitchenDashboard { kitchen: Kitchen; newRequests: number; activeBatches: number; activeOrders: number; today: number; last7Days: { date: string; amount: number }[]; delivered: number; gross: number; commission: number; net: number; available: number }
export interface KitchenBatch extends Omit<Batch, 'participants' | 'myOrderId' | 'myPortions'> { drops: number }
export interface RiderTask { key: string; isBatch: boolean; cook: { displayName: string; area: string }; drops: number; packages: number; dropAreas: string[]; earning: number; tips?: number; cashToCollect: number; tripKm: number; kmToKitchen: number | null }
export interface RiderOrder extends Omit<Order, 'customer'> { groupKey: string; cashToCollect: number; customer: { name: string; phone: string | null }; cook: { id: string; displayName: string; area: string; user?: { phone: string } } }
export type MealSlot = 'BREAKFAST' | 'LUNCH' | 'DINNER';
export type PlanPeriod = 'WEEKLY' | 'MONTHLY';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'ENDED';
export interface MealPlan {
  id: string; cookId: string; title: string; description: string; meal: MealSlot; period: PlanPeriod; days: number[]; pricePerMeal: number; deliverAt: string; capacity: number; active: boolean;
  createdAt: string; cook?: CookPublic; _count?: { subscriptions: number };
}
export interface Subscription {
  id: string; planId: string; status: SubscriptionStatus; startDate: string; endDate: string; addressText: string; area: string; notes: string | null; createdAt: string;
  plan: MealPlan & { cook: CookPublic };
}
export interface KitchenSubscriber {
  id: string; status: SubscriptionStatus; startDate: string; endDate: string; addressText: string; area: string; notes: string | null;
  plan: { title: string; meal: MealSlot; deliverAt: string }; customer: { name: string | null };
}
export type PlanInput = { title: string; description?: string; meal: MealSlot; period: PlanPeriod; days: number[]; pricePerMeal: number; deliverAt: string; capacity: number; active?: boolean };

export interface RateCard {
  version: number; updatedAt: string | null; commissionPct: number; serviceFee: number;
  deliveryFee: number; batchDeliveryFee: number; freeKm: number; deliveryPerKm: number;
  riderBase: number; riderPerKm: number; riderBatchDrop: number; riderCashLimit: number;
}
export interface SupportContact { phone: string | null; email: string; hours: string }
export interface PartnerTerms { rates: RateCard; accepted: boolean; acceptedAt: string | null; lastAcceptedVersion: number | null; support: SupportContact }
export type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export interface SupportMessage { id: string; fromAdmin: boolean; body: string; createdAt: string }
export interface SupportTicket { id: string; role: Role; orderId: string | null; subject: string; status: TicketStatus; createdAt: string; updatedAt: string; messages: SupportMessage[]; support?: SupportContact }
export interface RiderWallet { cashCollected: number; deposited: number; cashInHand: number; earnedTotal: number; deductions?: number; paidOut: number; unpaidEarnings: number; balance: number; cashLimit: number; overLimit: boolean }
