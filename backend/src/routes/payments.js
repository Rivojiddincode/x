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
  const parsedAmount = Math.round(Number(amount));

  if (!amount || isNaN(parsedAmount) || parsedAmount < 1000) {
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
      amount: parsedAmount,
      clientIp,
      paymentMethod: paymentMethod || undefined,
    });

    // order_id ni DB'ga pending holda saqlaymiz (webhook kelguncha)
    await prisma.paymentOrder.create({
      data: {
        orderId,
        steamId,
        amount: parsedAmount,
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

  const { order_id } = req.body;

  if (!order_id) {
    console.warn('[inPAY webhook] Yaroqsiz payload:', req.body);
    return;
  }

  console.log(`[inPAY webhook] order_id=${order_id} keldi, inPAY'dan haqiqiy holatni tasdiqlaymiz...`);

  try {
    const order = await prisma.paymentOrder.findUnique({ where: { orderId: order_id } });
    if (!order) {
      console.warn(`[inPAY webhook] order_id topilmadi: ${order_id}`);
      return;
    }
    if (order.status === 'success') {
      console.log(`[inPAY webhook] ${order_id} allaqachon muvaffaqiyatli, skip.`);
      return;
    }

    // MUHIM: webhook body'dagi status'ga ko'r-ko'rona ishonmaymiz (imzo bilan
    // tasdiqlanmagani uchun kimdir soxta so'rov yuborishi mumkin). Buning o'rniga
    // inPAY'ning o'z API'sidan (GET /transactions/) HAQIQIY holatni so'raymiz.
    const live = await getPaymentStatus(order_id);
    await processConfirmedPayment(order_id, live);
  } catch (err) {
    console.error('[inPAY webhook] Xatolik:', err.message);
  }
});

/**
 * Tasdiqlangan (inPAY'ning o'z API'sidan olingan) to'lov natijasini qayta ishlaydi.
 * Atomic (shartli) update orqali — agar order allaqachon 'success' bo'lsa,
 * update 0 qatorga tegadi va balans IKKINCHI MARTA qo'shilmaydi (webhook va
 * polling bir vaqtda ishga tushsa ham xavfsiz).
 */
async function processConfirmedPayment(orderId, live) {
  if (live.status !== 'success') {
    await prisma.paymentOrder.updateMany({
      where: { orderId, status: { not: 'success' } },
      data: { status: live.status, updatedAt: new Date() },
    });
    return;
  }

  // Faqat HALI 'success' bo'lmagan buyurtmani yangilaymiz — shartli (atomic) update.
  // count === 0 bo'lsa, demak boshqa so'rov (webhook yoki polling) allaqachon
  // ulgurgan — balansni qayta qo'shmaymiz.
  const result = await prisma.paymentOrder.updateMany({
    where: { orderId, status: { not: 'success' } },
    data: { status: 'success', updatedAt: new Date() },
  });

  if (result.count === 0) {
    console.log(`[inPAY] ${orderId} allaqachon boshqa so'rov tomonidan qayta ishlangan, skip.`);
    return;
  }

  const order = await prisma.paymentOrder.findUnique({ where: { orderId } });
  const paidAmount = Math.floor(Number(live.amount));

  await prisma.user.update({
    where: { steamId: order.steamId },
    data: { balance: { increment: paidAmount } },
  });

  console.log(`[inPAY] ✅ ${order.steamId} hisobiga ${paidAmount} UZS qo'shildi (order_id=${orderId})`);
}

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
        await processConfirmedPayment(orderId, live);
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
