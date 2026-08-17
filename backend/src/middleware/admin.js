// StarsCS — Admin ruxsati
// Oddiy, lekin ishonchli usul: .env dagi ADMIN_STEAM_IDS ro'yxatida bo'lgan
// steamId'lar admin hisoblanadi. Bu middleware har doim requireAuth'dan KEYIN
// ishlatiladi (req.user allaqachon token orqali tasdiqlangan bo'lishi kerak).

function getAdminSteamIds() {
  return (process.env.ADMIN_STEAM_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminSteamId(steamId) {
  return getAdminSteamIds().includes(steamId);
}

export function requireAdmin(req, res, next) {
  if (!req.user || !isAdminSteamId(req.user.steamId)) {
    return res.status(403).json({ success: false, message: 'Admin huquqi talab qilinadi' });
  }
  next();
}
