// StarsCS — Ban tekshiruvi
// requireAuth'dan KEYIN ishlatiladi. Agar foydalanuvchida aktiv BanRecord bo'lsa
// (muddati tugamagan yoki doimiy), sezgir amallarni bloklaydi.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkNotBanned(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Avtorizatsiya talab qilinadi' });
  }

  const user = await prisma.user.findUnique({
    where: { steamId: req.user.steamId },
    include: { ban: true },
  });

  if (!user || !user.ban) {
    return next();
  }

  const isPermanent = !user.ban.expiresAt;
  const isStillActive = isPermanent || new Date(user.ban.expiresAt) > new Date();

  if (!isStillActive) {
    // Muddati tugagan — avtomatik tozalab, davom ettiramiz
    await prisma.banRecord.delete({ where: { userId: user.id } }).catch(() => {});
    return next();
  }

  return res.status(403).json({
    success: false,
    message: isPermanent
      ? `Hisobingiz doimiy bloklangan. Sabab: ${user.ban.reason}`
      : `Hisobingiz ${new Date(user.ban.expiresAt).toLocaleDateString('uz-UZ')}gacha bloklangan. Sabab: ${user.ban.reason}`,
    banned: true,
    reason: user.ban.reason,
    expiresAt: user.ban.expiresAt,
  });
}

/**
 * Ban holatini shunchaki SO'RASH uchun (bloklashsiz) — frontend banner ko'rsatish uchun.
 */
export async function getBanStatus(steamId) {
  const user = await prisma.user.findUnique({ where: { steamId }, include: { ban: true } });
  if (!user || !user.ban) return { banned: false };

  const isPermanent = !user.ban.expiresAt;
  const isStillActive = isPermanent || new Date(user.ban.expiresAt) > new Date();
  if (!isStillActive) return { banned: false };

  return { banned: true, reason: user.ban.reason, expiresAt: user.ban.expiresAt, permanent: isPermanent };
}
