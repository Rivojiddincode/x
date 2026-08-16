// StarsCS — JWT Autentifikatsiya
//
// Steam login muvaffaqiyatli bo'lganda backend token yaratadi (generateToken).
// Frontend uni saqlaydi va har bir himoyalangan so'rovda
// `Authorization: Bearer <token>` header orqali yuboradi.
// requireAuth middleware shu tokenni tekshirib, req.user = { steamId } ni belgilaydi —
// route'lar endi so'rov tanasidagi (body/query) steamId'ga emas, req.user.steamId'ga ishonadi.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'starscs-fallback-secret-key-2026';
if (!process.env.JWT_SECRET) {
  console.warn('[auth] OGOHLANTIRISH: JWT_SECRET .env da topilmadi! Standart fallback secret ishlatilmoqda.');
}

const TOKEN_EXPIRY = '30d';

export function generateToken(steamId) {
  return jwt.sign({ steamId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Avtorizatsiya talab qilinadi — qaytadan Steam orqali kiring' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { steamId: decoded.steamId };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token yaroqsiz yoki muddati tugagan — qaytadan kiring' });
  }
}
