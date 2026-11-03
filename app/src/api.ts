import { storage } from './storage';
import type { Festival, HomeData, KitchenSubscriber, MealPlan, PartnerTerms, PlanInput, RiderWallet, Subscription, SupportContact, SupportTicket, Address, Batch, CookDetail, CookPublic, Dish, DishDetail, Fees, FoodRequest, Kitchen, KitchenBatch, KitchenDashboard, Me, Meta, Notification, Order, PaymentMethod, Proposal, Role, RiderOrder, RiderTask } from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const RT_KEY = 'maacrave.rt';

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSessionEnd: (() => void) | null = null;
export const setSessionEndHandler = (fn: () => void) => { onSessionEnd = fn; };

export async function setTokens(t: { accessToken: string; refreshToken: string }) {
  accessToken = t.accessToken; refreshToken = t.refreshToken;
  await storage.set(RT_KEY, t.refreshToken);
}
export async function clearTokens() {
  const rt = refreshToken; accessToken = null; refreshToken = null;
  await storage.remove(RT_KEY);
  if (rt) fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) }).catch(() => undefined);
}

/** Restores a session from the stored refresh token. */
export async function restoreSession(): Promise<boolean> {
  refreshToken = await storage.get(RT_KEY);
  return refreshToken ? refreshAccess() : false;
}

function refreshAccess(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
      if (!r.ok) { accessToken = null; refreshToken = null; await storage.remove(RT_KEY); return false; }
      await setTokens(await r.json());
      return true;
    } catch { return false; } finally { refreshing = null; }
  })();
  return refreshing;
}

type Opts = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; query?: Record<string, string | number | undefined | null> };

export async function api<T>(path: string, opts: Opts = {}, retry = true): Promise<T> {
  if (!API_URL) throw new ApiError('App is not configured: EXPO_PUBLIC_API_URL is missing.', 0);
  const qs = opts.query ? '?' + Object.entries(opts.query).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs === '?' ? '' : qs}`, {
      method: opts.method || 'GET',
      headers: { Accept: 'application/json', ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Couldn’t reach the MaaCrave server. Check your internet, or try again in a minute.', 0);
  }
  if (res.status === 401 && retry && refreshToken) {
    if (await refreshAccess()) return api<T>(path, opts, false);
    onSessionEnd?.();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const m = data?.message;
    throw new ApiError(Array.isArray(m) ? m[0] : m || 'Something went wrong. Please try again.', res.status);
  }
  return data as T;
}

/** Sign in with a mobile number (SMS code) or an email address (email code). */
/** A verification photo as a data URL. */
export type UploadDoc = { kind: 'NID_FRONT' | 'NID_BACK' | 'KITCHEN' | 'LICENSE'; data: string };

export type SignInTarget = { phone: string } | { email: string };

export type CheckoutBody =
  | { kind: 'cart'; items: { dishId: string; quantity: number }[]; couponCode?: string }
  | { kind: 'batch'; batchId: string; quantity: number; couponCode?: string }
  | { kind: 'request'; requestId: string; proposalId: string; allowGroup: boolean; couponCode?: string };

export const API = {
  // auth & profile
  requestOtp: (to: SignInTarget) => api<{ expiresInSeconds: number }>('/auth/otp/request', { method: 'POST', body: to }),
  googleSignIn: (idToken: string) => api<{ accessToken: string; refreshToken: string; isNew: boolean }>('/auth/google', { method: 'POST', body: { idToken } }),
  deleteAccount: () => api<{ ok: true }>('/me', { method: 'DELETE' }),
  verifyOtp: (to: SignInTarget, code: string) => api<{ accessToken: string; refreshToken: string; isNew: boolean }>('/auth/otp/verify', { method: 'POST', body: { ...to, code } }),
  me: () => api<Me>('/me'),
  updateMe: (b: Partial<Pick<Me, 'name' | 'area' | 'language' | 'dietPrefs' | 'allergies'>> & { acceptTerms?: boolean; referralCode?: string }) => api<Me>('/me', { method: 'PATCH', body: b }),
  contactRequest: (to: SignInTarget) => api<{ sent: boolean; saved?: boolean; expiresInSeconds: number }>('/me/contact/request', { method: 'POST', body: to }),
  contactVerify: (to: SignInTarget, code: string) => api<Me>('/me/contact/verify', { method: 'POST', body: { ...to, code } }),
  signOutEverywhere: () => api<{ ok: true }>('/me/sessions/revoke-all', { method: 'POST' }),
  addresses: () => api<Address[]>('/me/addresses'),
  addAddress: (b: Omit<Address, 'id' | 'isDefault' | 'lat' | 'lng'> & { isDefault?: boolean; lat?: number; lng?: number }) => api<Address>('/me/addresses', { method: 'POST', body: b }),
  setDefaultAddress: (id: string) => api<Address[]>(`/me/addresses/${id}/default`, { method: 'POST' }),
  deleteAddress: (id: string) => api<Address[]>(`/me/addresses/${id}`, { method: 'DELETE' }),
  applyCook: (b: { displayName: string; area: string; specialties: string[]; experience?: string; kitchenInfo?: string; hours?: string; dailyCapacity: number; nidLast4: string; documents: UploadDoc[] }) => api<Me>('/me/apply/cook', { method: 'POST', body: b }),
  applyRider: (b: { vehicle: string; nidLast4: string; documents: UploadDoc[] }) => api<Me>('/me/apply/rider', { method: 'POST', body: b }),
  favorites: () => api<{ id: string; dish: (Dish & { cook: CookPublic }) | null; cook: CookPublic | null }[]>('/me/favorites'),
  toggleFavorite: (b: { dishId?: string; cookId?: string }) => api<{ saved: boolean }>('/me/favorites/toggle', { method: 'POST', body: b }),
  notifications: (role: Role) => api<Notification[]>('/notifications', { query: { role } }),
  readAll: (role: Role) => api('/notifications/read-all', { method: 'POST', query: { role } }),
  pushToken: (token: string, platform: string) => api('/notifications/push-token', { method: 'POST', body: { token, platform } }),
  // catalog
  meta: () => api<Meta>('/meta'),
  home: () => api<HomeData>('/home'),
  festival: (id: string) => api<Festival & { open: boolean; dishes: (Dish & { cook: CookPublic })[] }>(`/festivals/${id}`),
  uploadPhoto: (kind: 'DISH' | 'PORTRAIT' | 'KITCHEN', data: string) => api<{ id: string; url: string }>('/media', { method: 'POST', body: { kind, data } }),
  dishes: (q: { q?: string; category?: string; sort?: string; area?: string; maxPrice?: number; take?: number; region?: string; tag?: string }) => api<(Dish & { cook: CookPublic })[]>('/dishes', { query: q }),
  dish: (id: string) => api<DishDetail>(`/dishes/${id}`),
  cooks: (q?: string) => api<CookPublic[]>('/cooks', { query: { q } }),
  cook: (id: string) => api<CookDetail>(`/cooks/${id}`),
  batches: (filter: string, area?: string) => api<Batch[]>('/batches', { query: { filter, area } }),
  batch: (id: string) => api<Batch>(`/batches/${id}`),
  // orders
  quote: (b: CheckoutBody & { addressId?: string; tip?: number }) => api<{ fees: Fees; couponError: string | null; scheduledFor?: string | null; items: { name: string; unitPrice: number; quantity: number }[] }>('/orders/quote', { method: 'POST', body: b }),
  placeOrder: (b: CheckoutBody & { tip?: number; addressId: string; paymentMethod: PaymentMethod; notes?: string; idempotencyKey: string; client: 'app' | 'web' }) => api<{ order: Order; paymentUrl: string | null; paymentError?: string | null }>('/orders', { method: 'POST', body: b }),
  orders: (scope: 'active' | 'past') => api<Order[]>('/orders', { query: { scope } }),
  order: (id: string) => api<Order>(`/orders/${id}`),
  pay: (id: string, client: 'app' | 'web') => api<{ paymentUrl: string }>(`/orders/${id}/pay`, { method: 'POST', body: { client } }),
  cancelOrder: (id: string) => api<Order>(`/orders/${id}/cancel`, { method: 'POST' }),
  review: (id: string, stars: number, text?: string) => api<Order>(`/orders/${id}/review`, { method: 'POST', body: { stars, text } }),
  complaint: (id: string, b: { type: string; text: string; refundRequested: boolean; refundAmount: number }) => api(`/orders/${id}/complaint`, { method: 'POST', body: b }),
  // requests
  requests: () => api<FoodRequest[]>('/requests'),
  createRequest: (b: { dishName: string; category: string; portions: number; budgetPerPortion: number; neededAt: string; addressId: string; spice: string; oil: string; diet: string[]; exclusions?: string; allergies?: string; notes?: string; allowGroup: boolean }) => api<FoodRequest>('/requests', { method: 'POST', body: b }),
  cancelRequest: (id: string) => api<FoodRequest[]>(`/requests/${id}/cancel`, { method: 'POST' }),
  declineProposal: (id: string, pid: string) => api<FoodRequest[]>(`/requests/${id}/proposals/${pid}/decline`, { method: 'POST' }),
  // kitchen (cook mode)
  kitchen: () => api<KitchenDashboard>('/kitchen'),
  updateKitchen: (b: Partial<Pick<Kitchen, 'intro' | 'specialties' | 'hours' | 'dailyCapacity' | 'accepting' | 'hygieneChecks' | 'payoutWallet'>> & { area?: string; lat?: number; lng?: number; story?: string; region?: string; portraitId?: string; kitchenPhotoId?: string }) => api<Kitchen>('/kitchen', { method: 'PATCH', body: b }),
  kitchenDishes: () => api<Dish[]>('/kitchen/dishes'),
  saveDish: (id: string | null, b: Partial<Dish>) => (id ? api<Dish>(`/kitchen/dishes/${id}`, { method: 'PATCH', body: b }) : api<Dish>('/kitchen/dishes', { method: 'POST', body: b })),
  removeDish: (id: string) => api(`/kitchen/dishes/${id}`, { method: 'DELETE' }),
  kitchenRequests: () => api<FoodRequest[]>('/kitchen/requests'),
  kitchenProposals: () => api<(Proposal & { request: { dishName: string; portions: number; status: string } })[]>('/kitchen/proposals'),
  propose: (id: string, pricePerPortion: number, note?: string) => api(`/kitchen/requests/${id}/propose`, { method: 'POST', body: { pricePerPortion, note } }),
  declineRequest: (id: string) => api(`/kitchen/requests/${id}/decline`, { method: 'POST' }),
  kitchenOrders: (scope: 'active' | 'done') => api<Order[]>('/kitchen/orders', { query: { scope } }),
  orderAction: (id: string, action: 'accept' | 'start' | 'ready' | 'decline') => api(`/kitchen/orders/${id}/${action}`, { method: 'POST' }),
  kitchenBatches: () => api<KitchenBatch[]>('/kitchen/batches'),
  createBatch: (b: { dishId: string; pricePerPortion: number; minPortions: number; maxPortions: number; closesInMinutes: number }) => api('/kitchen/batches', { method: 'POST', body: b }),
  batchAction: (id: string, action: 'close' | 'confirm' | 'cook' | 'ready' | 'cancel' | 'capacity', maxPortions?: number) => api(`/kitchen/batches/${id}/${action}`, { method: 'POST', body: maxPortions ? { maxPortions } : {} }),
  earnings: () => api<{ delivered: number; gross: number; commission: number; deductions?: number; net: number; available: number; recent: { id: string; code: string; updatedAt: string; subtotal: number; commission: number; cookEarning: number }[]; payouts: { id: string; amount: number; status: string; method: string; createdAt: string }[] }>('/kitchen/earnings'),
  requestPayout: () => api('/kitchen/payouts', { method: 'POST' }),

  plans: (q: { meal?: string; period?: string }) => api<MealPlan[]>('/plans', { query: q }),
  plan: (id: string) => api<MealPlan & { cook: CookPublic }>(`/plans/${id}`),
  subscribe: (id: string, b: { addressId: string; startDate: string; notes?: string }) => api<Subscription>(`/plans/${id}/subscribe`, { method: 'POST', body: b }),
  mySubscriptions: () => api<Subscription[]>('/me/subscriptions'),
  changeSubscription: (id: string, action: 'pause' | 'resume' | 'cancel') => api<Subscription[]>(`/subscriptions/${id}/${action}`, { method: 'POST' }),
  kitchenPlans: () => api<MealPlan[]>('/kitchen/plans'),
  createPlan: (b: PlanInput) => api<MealPlan>('/kitchen/plans', { method: 'POST', body: b }),
  editPlan: (id: string, b: Partial<Omit<PlanInput, 'meal' | 'period' | 'days'>>) => api<MealPlan>(`/kitchen/plans/${id}`, { method: 'PATCH', body: b }),
  subscribers: () => api<KitchenSubscriber[]>('/kitchen/subscribers'),
  // rider
  riderStatus: (online: boolean) => api('/rider/status', { method: 'PATCH', body: { online } }),
  riderTasks: () => api<RiderTask[]>('/rider/tasks'),
  acceptTask: (key: string) => api<RiderOrder[]>(`/rider/tasks/${key}/accept`, { method: 'POST' }),
  riderActive: () => api<RiderOrder[]>('/rider/active'),
  pickup: (key: string) => api<RiderOrder[]>(`/rider/groups/${key}/pickup`, { method: 'POST' }),
  startTrip: (key: string) => api<RiderOrder[]>(`/rider/groups/${key}/start`, { method: 'POST' }),
  deliver: (id: string, code: string) => api<RiderOrder[]>(`/rider/orders/${id}/deliver`, { method: 'POST', body: { code } }),
  riderEarnings: () => api<{ total: number; drops: number; today: number; week: number; last7Days: { date: string; amount: number }[]; recent: { id: string; code: string; area: string; riderPayout: number; tip: number; distanceKm: number | null; batchId: string | null; cash: number; updatedAt: string }[]; wallet: RiderWallet; ledger: { id: string; kind: 'CASH_DEPOSIT' | 'PAYOUT'; amount: number; reference: string | null; createdAt: string }[] }>('/rider/earnings'),
  riderLocation: (lat: number, lng: number) => api('/rider/location', { method: 'POST', body: { lat, lng } }),

  partnerTerms: (role: 'COOK' | 'RIDER') => api<PartnerTerms>('/partner/terms', { query: { role } }),
  acceptTerms: (role: 'COOK' | 'RIDER') => api<PartnerTerms>('/partner/terms/accept', { method: 'POST', body: { role } }),

  supportContact: () => api<SupportContact>('/support/contact'),
  tickets: () => api<SupportTicket[]>('/support'),
  ticket: (id: string) => api<SupportTicket>(`/support/${id}`),
  openTicket: (b: { role: Role; subject: string; body: string; orderId?: string }) => api<SupportTicket>('/support', { method: 'POST', body: b }),
  replyTicket: (id: string, body: string) => api<SupportTicket>(`/support/${id}/messages`, { method: 'POST', body: { body } }),
  closeTicket: (id: string) => api<SupportTicket>(`/support/${id}/close`, { method: 'POST' }),
};
