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
  const { price } = req.body;
  if (!price || Number(price) < 0.5) {
    return res.status(400).json({ success: false, message: 'Narx kamida $0.5 bo\'lishi kerak' });
  }
  const listing = await prisma.skinListing.update({
    where: { id: Number(req.params.id) },
    data: { status: 'ACTIVE', price: Number(price) },
  }).catch(() => null);
  if (!listing) return res.status(404).json({ success: false, message: 'Item topilmadi' });
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
  const { balance, vipRole, kills, deaths, score, level, headshotPct, winRate } = req.body;
  const data = {};
  // Faqat aniq yuborilgan maydonlar yangilanadi
  if (balance !== undefined) data.balance = Number(balance);
  if (vipRole !== undefined) data.vipRole = vipRole;
  if (kills !== undefined) data.kills = Number(kills);
  if (deaths !== undefined) data.deaths = Number(deaths);
  if (score !== undefined) data.score = Number(score);
  if (level !== undefined) data.level = Number(level);
  if (headshotPct !== undefined) data.headshotPct = Number(headshotPct);
  if (winRate !== undefined) data.winRate = Number(winRate);

  const user = await prisma.user.update({ where: { steamId: req.params.steamId }, data }).catch(() => null);
  if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
  res.json({ success: true, user });
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
