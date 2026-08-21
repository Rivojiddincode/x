// StarsCS — Admin Panel API
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, isAdminSteamId } from '../middleware/admin.js';

const prisma = new PrismaClient();
const router = express.Router();

// Frontend shu orqali "Admin" tugmasini ko'rsatish-ko'rsatmaslikni aniqlaydi.
// Bu — faqat UX uchun; haqiqiy himoya har bir amaliy route'da requireAdmin orqali.
router.get('/check', requireAuth, (req, res) => {
  res.json({ success: true, isAdmin: isAdminSteamId(req.user.steamId) });
});

router.use(requireAuth, requireAdmin);

// ---------------------------------------------------------
// Dashboard — umumiy statistika
// ---------------------------------------------------------
router.get('/stats', async (req, res) => {
  const [userCount, needsReviewCount, botStockCount, activeListingCount, pendingRequestCount, totalBalanceAgg] =
    await Promise.all([
      prisma.user.count(),
      prisma.skinTransaction.count({ where: { status: 'NEEDS_ADMIN_REVIEW' } }),
      prisma.skinListing.count({ where: { status: 'BOT_STOCK' } }),
      prisma.skinListing.count({ where: { status: 'ACTIVE' } }),
      prisma.requestTicket.count(),
      prisma.user.aggregate({ _sum: { balance: true } }),
    ]);

  res.json({
    success: true,
    stats: {
      userCount,
      needsReviewCount,
      botStockCount,
      activeListingCount,
      pendingRequestCount,
      totalBalanceUZS: totalBalanceAgg._sum.balance || 0,
    },
  });
});

// ---------------------------------------------------------
// E'tibor talab qiladigan bitimlar (xaridorga jo'natib bo'lmagan holatlar)
// ---------------------------------------------------------
router.get('/transactions/flagged', async (req, res) => {
  const txs = await prisma.skinTransaction.findMany({
    where: { status: 'NEEDS_ADMIN_REVIEW' },
    include: { listing: true, buyer: true, seller: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, transactions: txs });
});

// Admin qo'lda hal qilgach (masalan bot inventaridan itemni topib, qo'lda jo'natgach)
router.post('/transactions/:id/resolve', async (req, res) => {
  const tx = await prisma.skinTransaction.update({
    where: { id: Number(req.params.id) },
    data: { status: 'COMPLETED', failReason: null },
  }).catch(() => null);
  if (!tx) return res.status(404).json({ success: false, message: 'Bitim topilmadi' });
  res.json({ success: true, transaction: tx });
});

// ---------------------------------------------------------
// Bot zaxirasi (Instant-sell orqali botga o'tgan itemlar) — qayta sotuvga qo'yish
// ---------------------------------------------------------
router.get('/bot-stock', async (req, res) => {
  const listings = await prisma.skinListing.findMany({
    where: { status: 'BOT_STOCK' },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, listings });
});

router.post('/bot-stock/:id/resell', async (req, res) => {
  const listingId = Number(req.params.id);
  const { price } = req.body;
  const parsedPrice = Math.round(Number(price));
  if (!price || parsedPrice < 6500) {
    return res.status(400).json({ success: false, message: 'Narx kamida 6 500 UZS bo\'lishi kerak' });
  }

  // Atomic lock: faqat status hali ham 'BOT_STOCK' bo'lsa ACTIVE'ga o'tkazamiz
  const result = await prisma.skinListing.updateMany({
    where: { id: listingId, status: 'BOT_STOCK' },
    data: { status: 'ACTIVE', price: parsedPrice },
  });

  if (result.count === 0) {
    return res.status(409).json({ success: false, message: 'Item topilmadi yoki allaqachon sotuvga qo\'yilgan' });
  }

  const listing = await prisma.skinListing.findUnique({ where: { id: listingId } });
  res.json({ success: true, listing });
});

// ---------------------------------------------------------
// Foydalanuvchilar — qidirish va tahrirlash (statistika, balans tuzatish)
// ---------------------------------------------------------
router.get('/users', async (req, res) => {
  const { search } = req.query;
  const users = await prisma.user.findMany({
    where: search
      ? { OR: [{ displayName: { contains: search, mode: 'insensitive' } }, { steamId: { contains: search } }] }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { ban: true },
  });
  res.json({ success: true, users });
});

router.patch('/users/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const { balance, vipRole, kills, deaths, score, level, headshotPct, winRate } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { steamId } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    const MAX_INT4 = 2147483647;
    const MIN_INT4 = -2147483648;
    const clampInt = (val) => Math.max(MIN_INT4, Math.min(MAX_INT4, val));

    const data = {};
    if (balance !== undefined && balance !== '') {
      const num = Math.round(Number(balance));
      if (!isNaN(num)) data.balance = clampInt(num);
    }
    if (vipRole !== undefined) data.vipRole = String(vipRole);
    if (kills !== undefined && kills !== '') {
      const num = Math.round(Number(kills));
      if (!isNaN(num)) data.kills = clampInt(num);
    }
    if (deaths !== undefined && deaths !== '') {
      const num = Math.round(Number(deaths));
      if (!isNaN(num)) data.deaths = clampInt(num);
    }
    if (score !== undefined && score !== '') {
      const num = Math.round(Number(score));
      if (!isNaN(num)) data.score = clampInt(num);
    }
    if (level !== undefined && level !== '') {
      const num = Math.round(Number(level));
      if (!isNaN(num)) data.level = clampInt(num);
    }
    if (headshotPct !== undefined && headshotPct !== '') {
      const num = Number(headshotPct);
      if (!isNaN(num)) data.headshotPct = Math.max(0, Math.min(100, num));
    }
    if (winRate !== undefined && winRate !== '') {
      const num = Number(winRate);
      if (!isNaN(num)) data.winRate = Math.max(0, Math.min(100, num));
    }

    const updatedUser = await prisma.user.update({
      where: { steamId },
      data,
    });

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Foydalanuvchini saqlashda xatolik: ' + err.message });
  }
});

// ---------------------------------------------------------
// Banlar
// ---------------------------------------------------------
router.post('/bans', async (req, res) => {
  const { steamId, reason, durationDays } = req.body;
  if (!steamId || !reason) {
    return res.status(400).json({ success: false, message: 'steamId va reason talab qilinadi' });
  }
  const user = await prisma.user.findUnique({ where: { steamId } });
  if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

  const expiresAt = durationDays ? new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000) : null;

  const ban = await prisma.banRecord.upsert({
    where: { userId: user.id },
    update: { reason, expiresAt, bannedBy: req.user.steamId },
    create: { userId: user.id, reason, expiresAt, bannedBy: req.user.steamId },
  });
  res.json({ success: true, ban });
});

router.delete('/bans/:steamId', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { steamId: req.params.steamId } });
  if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
  await prisma.banRecord.delete({ where: { userId: user.id } }).catch(() => null);
  res.json({ success: true, message: 'Ban bekor qilindi' });
});

// ---------------------------------------------------------
// Murojaatlar (support ticketlar)
// ---------------------------------------------------------
router.get('/requests', async (req, res) => {
  const requests = await prisma.requestTicket.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ success: true, requests });
});

export default router;
