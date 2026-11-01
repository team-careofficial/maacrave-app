import { PrismaClient } from '@prisma/client';

// Seeds only platform configuration. No sample users, cooks, dishes or orders.
const prisma = new PrismaClient();

async function main() {
  await prisma.platformSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const coupons = [
    { code: 'FIRSTHOME', type: 'PERCENT', value: 15, minOrder: 0, maxDiscount: 80, description: '15% off your first order, up to ৳80' },
    { code: 'BATCH20', type: 'FLAT', value: 20, minOrder: 0, maxDiscount: 20, batchOnly: true, description: '৳20 off any group order' },
  ];
  for (const c of coupons) await prisma.coupon.upsert({ where: { code: c.code }, update: {}, create: c });
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
