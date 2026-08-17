// StarsCS — inPAY To'lov Route'lari
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { sensitiveActionLimiter } from '../middleware/rateLimit.js';
import { createInvoice, getPaymentStatus } from '../services/inpay.js';

const prisma = new PrismaClient();
const router = express.Router();

// ─── POST /api/v1/payments/inpay/create ─────────────────────────────────────
// Yangi inPAY to'lov invoice yaratadi.
// Auth talab qilinadi — faqat tizimga kirgan foydalanuvchilar to'lay oladi.
router.post('/create', requireAuth, sensitiveActionLimiter, async (req, res) => {
  const steamId = req.user.steamId;
  const { amount, paymentMethod } = req.body;

  if (!amount || Number(amount) < 1000) {
    return res.status(400).json({
      success: false,
      message: "Minimal to'lov summasi 1 000 UZS",
      error_code: 'AMOUNT_TOO_LOW',
    });
  }

  // Foydalanuvchining haqiqiy IP manzilini inPAY'ga yuborish (anti-fraud uchun)
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress;

  try {
    const { orderId, payUrl } = await createInvoice({
      steamId,
      amount: Number(amount),
      clientIp,
      paymentMethod: paymentMethod || undefined,
    });

    // order_id ni DB'ga pending holda saqlaymiz (webhook kelguncha)
    await prisma.paymentOrder.create({
      data: {
        orderId,
        steamId,
        amount: Number(amount),
        status: 'pending',
        paymentMethod: paymentMethod || null,
      },
    });

    return res.json({ success: true, orderId, payUrl });
  } catch (err) {
    console.error('[inPAY create] Xatolik:', err.message);
    return res.status(502).json({
      success: false,
      message: err.message,
      error_code: err.code || 'INPAY_ERROR',
    });
  }
});

// ─── POST /api/v1/payments/inpay/webhook ────────────────────────────────────
// inPAY to'lov holati o'zgarganda shu endpoint'ga POST yuboradi.
// MUHIM: har doim HTTP 200 qaytarish kerak — aks holda inPAY qayta urinadi.
router.post('/webhook', express.json(), async (req, res) => {
  // Darhol 200 qaytaramiz — keyingi ishlov asinxron bajariladi
  res.sendStatus(200);

  const { order_id, status, amount } = req.body;

  if (!order_id || !status) {
    console.warn('[inPAY webhook] Yaroqsiz payload:', req.body);
    return;
  }

  console.log(`[inPAY webhook] order_id=${order_id} status=${status} amount=${amount}`);

  try {
    const order = await prisma.paymentOrder.findUnique({ where: { orderId: order_id } });

    if (!order) {
      console.warn(`[inPAY webhook] order_id topilmadi: ${order_id}`);
      return;
    }

    // Takroriy webhook'lardan himoya — allaqachon qayta ishlangan bo'lsa skip
    if (order.status === 'success') {
      console.log(`[inPAY webhook] ${order_id} allaqachon muvaffaqiyatli, skip.`);
      return;
    }

    await prisma.paymentOrder.update({
      where: { orderId: order_id },
      data: { status, updatedAt: new Date() },
    });

    // Faqat muvaffaqiyatli to'lovlarda balansni yangilaymiz
    if (status === 'success') {
      const paidAmount = Math.floor(Number(amount)); // tiyin bo'lishi mumkin

      await prisma.user.update({
        where: { steamId: order.steamId },
        data: { balance: { increment: paidAmount } },
      });

      console.log(`[inPAY webhook] ✅ ${order.steamId} hisobiga ${paidAmount} UZS qo'shildi`);
    }
  } catch (err) {
    console.error('[inPAY webhook] DB xatoligi:', err.message);
  }
});

// ─── GET /api/v1/payments/inpay/status/:orderId ──────────────────────────────
// To'lov holatini polling orqali tekshirish (webhook kelmasa fallback).
router.get('/status/:orderId', requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const steamId = req.user.steamId;

  try {
    // Birinchi DB'dan tekshiramiz
    const order = await prisma.paymentOrder.findUnique({ where: { orderId } });

    if (!order) {
      return res.status(404).json({ success: false, message: "Buyurtma topilmadi" });
    }

    // Foydalanuvchi faqat o'zining buyurtmasini ko'ra oladi
    if (order.steamId !== steamId) {
      return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
    }

    // Agar DB'da hali pending bo'lsa — inPAY'dan so'rang
    if (order.status === 'pending') {
      const live = await getPaymentStatus(orderId);
      if (live.status !== 'pending') {
        // DB ni yangilash
        await prisma.paymentOrder.update({
          where: { orderId },
          data: { status: live.status, updatedAt: new Date() },
        });

        // success bo'lsa balansni yangilash (webhook kelmagan bo'lsa)
        if (live.status === 'success') {
          await prisma.user.update({
            where: { steamId },
            data: { balance: { increment: live.amount } },
          });
          console.log(`[inPAY status] ✅ ${steamId} hisobiga ${live.amount} UZS (polling orqali)`);
        }

        return res.json({ success: true, status: live.status, amount: live.amount });
      }
    }

    return res.json({ success: true, status: order.status, amount: order.amount });
  } catch (err) {
    console.error('[inPAY status] Xatolik:', err.message);
    return res.status(502).json({ success: false, message: err.message });
  }
});

export default router;
