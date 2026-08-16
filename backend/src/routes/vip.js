// StarsCS — VIP Xarid Route
// Balansdan haqiqiy pul yechadi va vipRole/vipExpiresAt'ni SERVER TOMONIDA belgilaydi.
// Client hech qachon "menga VIP bering" deb to'g'ridan-to'g'ri buyura olmaydi —
// faqat mavjud balansi yetarli bo'lsa, shu narx bo'yicha xarid amalga oshadi.

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Tariflar — narx va berilayotgan rol FAQAT shu yerda, serverda belgilangan.
// Frontend faqat shu ro'yxatdagi `id`ni yuboradi, narxni o'zi belgilay olmaydi.
const VIP_TIERS = {
  'vip-silver': { name: 'VIP Silver', price: 35000, durationDays: 30 },
  'vip-gold': { name: 'VIP Gold', price: 65000, durationDays: 30 },
  'vip-diamond': { name: 'VIP Diamond', price: 110000, durationDays: 30 },
  'custom-fov': { name: 'Custom FOV Unlock', price: 25000, durationDays: 30 },
  'reserved-slot': { name: 'Reserved Slot Access', price: 20000, durationDays: 30 },
  'skin-pass': { name: 'Premium Skin Pass', price: 45000, durationDays: 30 },
};

router.post('/purchase', requireAuth, async (req, res) => {
  const steamId = req.user.steamId;
  const { tierId } = req.body;

  const tier = VIP_TIERS[tierId];
  if (!tier) {
    return res.status(400).json({ success: false, message: 'Noma\'lum tarif' });
  }

  const user = await prisma.user.findUnique({ where: { steamId } });
  if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

  if (user.balance < tier.price) {
    return res.status(400).json({
      success: false,
      message: `Balans yetarli emas. Kerak: ${tier.price.toLocaleString()} UZS, mavjud: ${user.balance.toLocaleString()} UZS`,
      needsTopUp: true,
      shortfall: tier.price - user.balance,
    });
  }

  const expiresAt = new Date(Date.now() + tier.durationDays * 24 * 60 * 60 * 1000);

  const updatedUser = await prisma.user.update({
    where: { steamId },
    data: {
      balance: { decrement: tier.price },
      vipRole: tier.name,
      vipExpiresAt: expiresAt.toISOString(),
    },
  });

  res.json({
    success: true,
    message: `${tier.name} muvaffaqiyatli xarid qilindi! Amal qilish muddati: ${tier.durationDays} kun.`,
    user: updatedUser,
  });
});

export default router;
