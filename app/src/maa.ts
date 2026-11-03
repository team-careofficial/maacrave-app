import { API_URL } from './api';
import type { Dish } from './types';

/** A photo a cook uploaded (dish, her portrait, her kitchen). */
export const mediaUrl = (id?: string | null) => (id ? `${API_URL}/media/${id}` : null);

/** "নিজের জেলার স্বাদ": districts and the dish each is loved for. Keys match the backend REGIONS list. */
export const REGIONS: Record<string, { en: string; bn: string; known: string; knownBn: string; tint: string }> = {
  chattogram: { en: 'Chattogram', bn: 'চট্টগ্রাম', known: 'Mezbani beef, shutki', knownBn: 'মেজবানি মাংস, শুঁটকি', tint: '#B5492F' },
  sylhet: { en: 'Sylhet', bn: 'সিলেট', known: 'Satkora beef, tenga', knownBn: 'সাতকরা মাংস, টেংগা', tint: '#4E7D3A' },
  barishal: { en: 'Barishal', bn: 'বরিশাল', known: 'Ilish, coconut curries', knownBn: 'ইলিশ, নারকেলের তরকারি', tint: '#2F6E8E' },
  'old-dhaka': { en: 'Old Dhaka', bn: 'পুরান ঢাকা', known: 'Kacchi, bakarkhani', knownBn: 'কাচ্চি, বাকরখানি', tint: '#7A1F24' },
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী', known: 'Kalai roti, mango treats', knownBn: 'কালাই রুটি, আমের পদ', tint: '#C98500' },
  khulna: { en: 'Khulna', bn: 'খুলনা', known: 'Chui jhal, golda chingri', knownBn: 'চুইঝাল, গলদা চিংড়ি', tint: '#8C3B1E' },
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ', known: 'Monda, river fish', knownBn: 'মণ্ডা, নদীর মাছ', tint: '#6B5A2E' },
  noakhali: { en: 'Noakhali', bn: 'নোয়াখালী', known: 'Narikel pitha, hash bhuna', knownBn: 'নারকেল পিঠা, হাঁস ভুনা', tint: '#3F6B5E' },
  cumilla: { en: 'Cumilla', bn: 'কুমিল্লা', known: 'Roshmalai', knownBn: 'রসমালাই', tint: '#9A4A63' },
  rangpur: { en: 'Rangpur', bn: 'রংপুর', known: 'Shidol bhorta, pitha', knownBn: 'সিদল ভর্তা, পিঠা', tint: '#5B6C2F' },
  faridpur: { en: 'Faridpur', bn: 'ফরিদপুর', known: 'Khejur gur sweets', knownBn: 'খেজুর গুড়ের মিষ্টি', tint: '#8A5A12' },
  bogura: { en: 'Bogura', bn: 'বগুড়া', known: 'Doi, chitoi pitha', knownBn: 'দই, চিতই পিঠা', tint: '#7B4B2A' },
};

/** Bangla possessive: চট্টগ্রাম → চট্টগ্রামের, খুলনা → খুলনার. */
export const bnOf = (w: string) => (/[\u09BE-\u09CC\u0985-\u0994]$/.test(w) ? w + 'র' : w + 'ের');

/** "রবিবার, ৮ নভেম্বর" in Bangla, "Sunday, 8 November" in English. */
export const festDay = (iso: string, lang: string) => new Date(iso).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** Health and care labels cooks add to dishes ("স্বাস্থ্য ও যত্ন"). Keys match the backend HEALTH_TAGS list. */
export const HEALTH: Record<string, { en: string; bn: string; color: string }> = {
  diabetic: { en: 'Diabetic-friendly', bn: 'ডায়াবেটিস-বান্ধব', color: '#2F6E8E' },
  'low-oil': { en: 'Low oil', bn: 'কম তেল', color: '#4E7D3A' },
  'low-salt': { en: 'Low salt', bn: 'কম লবণ', color: '#3F6B5E' },
  kids: { en: 'For kids', bn: 'বাচ্চাদের জন্য', color: '#C98500' },
  patient: { en: 'Patient’s meal', bn: 'রোগীর পথ্য', color: '#9A4A63' },
  veg: { en: 'Vegetarian', bn: 'নিরামিষ', color: '#5B6C2F' },
};

/** Allergens a customer can say they avoid. Same labels cooks tick on each dish. */
export const ALLERGY: Record<string, string> = {
  Milk: 'দুধ', Egg: 'ডিম', Fish: 'মাছ', Shellfish: 'চিংড়ি / কাঁকড়া', Nuts: 'বাদাম', Peanut: 'চিনাবাদাম', Wheat: 'গম', Soy: 'সয়া', Sesame: 'তিল', Mustard: 'সর্ষে',
};

/** Which of the customer's allergies this dish contains. */
export const allergyHits = (d: Pick<Dish, 'allergens'>, allergies?: string[] | null) =>
  allergies?.length ? d.allergens.filter((a) => allergies.some((x) => x.toLowerCase() === a.toLowerCase())) : [];

/** The region a dish belongs to: its own, or its cook's home district. */
export const regionOf = (d: Pick<Dish, 'region'> & { cook?: { region?: string | null } }) => d.region || d.cook?.region || null;

/** "3 days 4 h" style countdown to a date, or null once it has passed. */
export function untilParts(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400_000), h = Math.floor((ms % 86400_000) / 3600_000), m = Math.floor((ms % 3600_000) / 60_000);
  return { d, h, m };
}
