// StarsCS — VIP Xarid Route
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { sensitiveActionLimiter } from '../middleware/rateLimit.js';
import { checkNotBanned } from '../middleware/ban.js';

const prisma = new PrismaClient();
const router = express.Router();

export const VIP_TIERS = {
  'vip-silver': {
    name: 'VIP Silver', price: 35000, durationDays: 30, color: '#a0aec0', popular: false,
    features: [
      "Barcha serverlarga kirish ustunligi (Reserved Slot)",
      "Maxsus VIP Chat tegi `[VIP Silver]`",
      "O'yin boshida +105 HP va qo'shimcha zirh",
    ],
  },
  'vip-gold': {
    name: 'VIP Gold', price: 65000, durationDays: 30, color: '#ffa300', popular: true,
    features: [
      "Silver darajasidagi barcha imkoniyatlar",
      "Har bir roundda +$1000 qo'shimcha pul",
      "Unikal agent modellarini tanlash",
      "Custom FOV o'rnatish imkoniyati",
      "Avtomatik defuse kit",
    ],
  },
  'vip-diamond': {
    name: 'VIP Diamond', price: 110000, durationDays: 30, color: '#5a80f2', popular: false,
    features: [
      "Barcha Gold va Silver afzalliklari",
      "Eksklyuziv Diamond statusi va rangi",
      "Har o'ldirishda +10 HP tiklanish",
      "Premium Knives & Gloves Skinchanger kirishi",
    ],
  },
  'custom-fov': {
    name: 'Custom FOV Unlock', price: 25000, durationDays: 30, color: '#64ce82', popular: false,
    features: ["O'yin maydonini (FOV) 120 gradusgacha kengaytirish", "Qurol ko'rinish joylashuvini sozlash"],
  },
  'reserved-slot': {
    name: 'Reserved Slot Access', price: 20000, durationDays: 30, color: '#ff4940', popular: false,
    features: ["Server 100% to'lganida ham ustun ulanish navbati"],
  },
  'skin-pass': {
    name: 'Premium Skin Pass', price: 45000, durationDays: 30, color: '#e2e8f0', popular: false,
    features: ["CS2 ning eng so'nggi va qimmatbaho pichoqlari", "StatTrak™ hisoblagichi bilan barcha qurollar"],
  },
};

// Ochiq (auth shart emas) — do'kon sahifasi shundan ko'rsatadi
router.get('/tiers', (req, res) => {
  const tiers = Object.entries(VIP_TIERS).map(([id, t]) => ({ id, ...t }));
  res.json({ success: true, tiers });
});

router.post('/purchase', requireAuth, checkNotBanned, sensitiveActionLimiter, async (req, res) => {
  const steamId = req.user.steamId;
  const { tierId } = req.body;

  const tier = VIP_TIERS[tierId];
  if (!tier) {
    return res.status(400).json({ success: false, message: 'Noma\'lum tarif' });
  }

  const user = await prisma.user.findUnique({ where: { steamId } });
  if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

  const expiresAt = new Date(Date.now() + tier.durationDays * 24 * 60 * 60 * 1000);

  // MUHIM: Atomic updateMany — faqat foydalanuvchida HALI HAM balance >= tier.price bo'lsagina ayiramiz.
  // Bu parallel/poyga holatida yuborilgan so'rovlar tufayli balans manfiy bo'lib qolishining oldini oladi.
  const updateResult = await prisma.user.updateMany({
    where: { steamId, balance: { gte: tier.price } },
    data: {
      balance: { decrement: tier.price },
      vipRole: tier.name,
      vipExpiresAt: expiresAt.toISOString(),
    },
  });

  if (updateResult.count === 0) {
    return res.status(400).json({
      success: false,
      message: `Balans yetarli emas. Kerak: ${tier.price.toLocaleString()} UZS, mavjud: ${user.balance.toLocaleString()} UZS`,
      needsTopUp: true,
      shortfall: tier.price - user.balance,
    });
  }

  const updatedUser = await prisma.user.findUnique({ where: { steamId } });

  res.json({
    success: true,
    message: `${tier.name} muvaffaqiyatli xarid qilindi! Amal qilish muddati: ${tier.durationDays} kun.`,
    user: updatedUser,
  });
});

export default router;
