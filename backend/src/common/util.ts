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
export const orderCode = () => 'MC-' + Date.now().toString(36).toUpperCase().slice(-5) + randomInt(10, 99);

export const DHAKA_AREAS = ['Mirpur 1','Mirpur 2','Mirpur 10','Mirpur 12','Pallabi','Kazipara','Shewrapara','Agargaon','Mohammadpur','Dhanmondi','Lalmatia','Farmgate','Tejgaon','Banani','Gulshan','Mohakhali','Uttara','Badda','Rampura','Bashundhara','Khilgaon','Motijheel','Old Dhaka','Jatrabari'];
export const CATEGORIES = ['rice','bengali','fish','chicken','beef','veg','snacks','breakfast','lunch','dinner','dessert','healthy'];
