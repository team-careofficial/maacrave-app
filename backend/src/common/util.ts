import { createHash, randomBytes, randomInt } from 'crypto';

export const BD_PHONE = /^01[3-9]\d{8}$/;
export function normalizePhone(input: string): string {
  let p = String(input || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');
  if (/^1[3-9]\d{8}$/.test(p)) p = '0' + p;
  return p;
}
export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export const digits = (n: number) => Array.from({ length: n }, () => randomInt(0, 10)).join('');
/** Short, readable order code, e.g. MC-7KQ4M2X. 31^7 ≈ 27 billion combinations, no 0/O or 1/I confusion. */
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const orderCode = () => 'MC-' + Array.from({ length: 7 }, () => CODE_CHARS[randomInt(0, CODE_CHARS.length)]).join('');

export const DHAKA_AREAS = ['Mirpur 1','Mirpur 2','Mirpur 10','Mirpur 12','Pallabi','Kazipara','Shewrapara','Agargaon','Mohammadpur','Dhanmondi','Lalmatia','Farmgate','Tejgaon','Banani','Gulshan','Mohakhali','Uttara','Badda','Rampura','Bashundhara','Khilgaon','Motijheel','Old Dhaka','Jatrabari'];
export const CATEGORIES = ['rice','bengali','fish','chicken','beef','veg','snacks','breakfast','lunch','dinner','dessert','healthy'];

/** Districts whose home cooking MaaCrave highlights ("নিজের জেলার স্বাদ"). */
export const REGIONS = ['chattogram', 'sylhet', 'barishal', 'old-dhaka', 'rajshahi', 'khulna', 'mymensingh', 'noakhali', 'cumilla', 'rangpur', 'faridpur', 'bogura'];
/** Health and diet labels a cook can put on a dish. */
export const HEALTH_TAGS = ['diabetic', 'low-oil', 'low-salt', 'kids', 'patient', 'veg'];
/** Things customers can say they avoid; dishes listing these in allergens get a warning. */
export const ALLERGENS = ['Milk', 'Egg', 'Fish', 'Shellfish', 'Nuts', 'Peanut', 'Wheat', 'Soy', 'Sesame', 'Mustard'];
