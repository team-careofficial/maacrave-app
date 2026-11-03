// CI-only layout check: renders signed-in screens against stubbed API answers.
// These fixtures exist only inside this test run; they are never shipped in the app or the database.
import { chromium } from 'playwright';
import zlib from 'node:zlib';

const API = 'https://maacrave-api.onrender.com/v1';
const soon = (d) => new Date(Date.now() + d * 86400_000).toISOString();

// a warm gradient PNG standing in for a cook's photo
function png(w, h, a, b) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const t = (x + y) / (w + h); const i = y * (w * 3 + 1) + 1 + x * 3; for (let c = 0; c < 3; c++) raw[i + c] = Math.round(a[c] * (1 - t) + b[c] * t); } }
  const crc = (buf) => { let c, k, r = -1; for (let n = 0; n < buf.length; n++) { c = (r ^ buf[n]) & 0xff; for (k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PHOTO = png(320, 240, [214, 140, 40], [122, 31, 36]);

const cook = { id: 'c1', userId: 'u2', displayName: 'Rokeya Begum', area: 'Dhanmondi', intro: 'Home kitchen in Dhanmondi 27.', specialties: ['Mezbani', 'Bhorta'], rating: 4.8, ratingCount: 126, completedOrders: 412, hours: '11am – 9pm', accepting: true, lat: 23.746, lng: 90.376,
  story: 'I have cooked for my family for thirty years. My children say my mezbani beef tastes like Chattogram weddings.', region: 'chattogram', portraitId: 'p1', kitchenPhotoId: 'k1', createdAt: soon(-200) };
const dish = (id, name, nameBn, price, extra = {}) => ({ id, cookId: 'c1', name, nameBn, category: 'beef', price, portion: '1 plate', prepMinutes: 40, ingredients: ['Beef', 'Mustard oil'], allergens: ['Mustard'], description: 'Slow-cooked the Chattogram way with whole spices.', spice: 2, dailyCapacity: 20, available: true, rating: 4.9, ratingCount: 58, orderCount: 230, photoId: 'd1', region: 'chattogram', healthTags: [], festivalId: null, cook, ...extra });
const dishes = [dish('d1', 'Mezbani beef', 'মেজবানি মাংস', 280), dish('d2', 'Lau chingri, low oil', 'লাউ চিংড়ি', 160, { photoId: null, category: 'fish', healthTags: ['low-oil', 'diabetic'], allergens: ['Shellfish'], region: null })];
const me = { id: 'u1', phone: '01712345678', email: null, name: 'Tanvir Ahmed', area: 'Dhanmondi', language: 'bn', loyaltyPoints: 0, referralCode: 'TANVIR1A2B', termsAcceptedAt: soon(-3), phoneVerifiedAt: soon(-3), createdAt: soon(-3), dietPrefs: ['diabetic'], allergies: ['Shellfish'], roles: [{ role: 'CUSTOMER', status: 'APPROVED' }], cook: null, rider: null };
const fest = { id: 'f1', title: 'Pitha Utsob', titleBn: 'পিঠা উৎসব', blurb: 'Bhapa, chitoi and patishapta from mothers’ kitchens', blurbBn: 'মায়েদের হাতের ভাপা, চিতই আর পাটিসাপটা', opensAt: soon(-1), closesAt: soon(3.2), deliverOn: soon(5), active: true, dishCount: 7 };
const routes = {
  '/auth/refresh': { accessToken: 'a', refreshToken: 'r' },
  '/me': me,
  '/meta': { categories: [], areas: ['Dhanmondi'], fees: { serviceFee: 12, deliveryFee: 45, batchDeliveryFee: 30, commissionPct: 12 }, coupons: [], payments: { bkash: false, card: false, cod: true } },
  '/home': { featured: { ...cook, dishes: dishes.map(({ id, name, nameBn, price, photoId }) => ({ id, name, nameBn, price, photoId })).concat([{ id: 'd3', name: 'Shutki bhorta', nameBn: 'শুঁটকি ভর্তা', price: 90, photoId: null }]) }, festivals: [fest], regions: [{ key: 'chattogram', dishes: 12 }, { key: 'sylhet', dishes: 6 }, { key: 'old-dhaka', dishes: 9 }, { key: 'barishal', dishes: 4 }], healthyCount: 8 },
  '/dishes': dishes, '/cooks': [cook],
  '/cooks/c1': { ...cook, dishes, reviews: [], openBatches: [] },
  '/dishes/d1': { ...dishes[0], reviews: [], openBatch: null },
  '/dishes/d2': { ...dishes[1], reviews: [], openBatch: null },
  '/festivals/f1': { ...fest, open: true, dishes: [dish('d4', 'Bhapa pitha', 'ভাপা পিঠা', 120, { category: 'dessert', festivalId: 'f1', region: 'rangpur', photoId: 'd1' })] },
};

const b = await chromium.launch();
for (const [name, path, lang] of [['home-bn', '/', 'bn'], ['home-en', '/', 'en'], ['cook-bn', '/cook/c1', 'bn'], ['dish-bn', '/dish/d2', 'bn'], ['festival-bn', '/festival/f1', 'bn'], ['browse-region', '/browse?region=chattogram', 'bn'], ['diet-bn', '/diet', 'bn']]) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.addInitScript((l) => { localStorage.setItem('maacrave.rt', 'r'); localStorage.setItem('maacrave.lang', l); }, lang);
  await p.route(API + '/**', (r) => {
    const u = new URL(r.request().url()); const key = u.pathname.replace('/v1', '');
    if (key.startsWith('/media/')) return r.fulfill({ status: 200, contentType: 'image/png', body: PHOTO });
    const body = routes[key] ?? (r.request().method() === 'GET' ? [] : {});
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await p.goto('http://localhost:4173' + path); await p.waitForTimeout(6500);
  await p.screenshot({ path: `../shots/${name}.png` });
  // the app scrolls inside its own view: photograph further down too
  for (const k of [1, 2, 3]) {
    if (!(name.startsWith('home') || name.startsWith('cook')) || (k > 1 && !name.startsWith('home'))) break;
    const moved = await p.evaluate((k) => { const els = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 40 && getComputedStyle(d).overflowY !== 'visible'); const el = els.sort((a, b) => b.scrollHeight - a.scrollHeight)[0]; if (!el) return false; el.scrollTop = k * (el.clientHeight - 120); return true; }, k);
    if (!moved) break;
    await p.waitForTimeout(900);
    await p.screenshot({ path: `../shots/${name}-${k}.png` });
  }
  await p.close();
}
await b.close();
