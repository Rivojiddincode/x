// StarsCS — Rate Limiting
// Turli sezuvchanlik darajasidagi endpointlar uchun alohida chegaralar.
// Bu, masalan, kimdir bir necha soniyada minglab "sotib olish" yoki
// Steam login so'rovi yuborib, serverni yoki Steam API kvotasini
// "bombardimon" qilishining oldini oladi.

import rateLimit from 'express-rate-limit';

// Umumiy — barcha API uchun bazaviy chegara
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p so\'rov yuborildi, biroz kuting.' },
});

// Pul/mulk bilan bog'liq amallar (xarid, tezkor sotish, listing yaratish) — qattiqroq
export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p urinish. 1 daqiqadan keyin qayta urinib ko\'ring.' },
});

// Steam login — qayta-qayta login urinishlarining oldini olish uchun
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p login urinishi. Birozdan keyin qayta urinib ko\'ring.' },
});
