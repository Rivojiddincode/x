import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { db } from './services/db.js';
import marketRouter, { registerTradeStateWatcher, startEscrowReleaseChecker } from './routes/marketplace.js';
import { startBot } from './services/steamBot.js';
import { generateToken, requireAuth } from './middleware/auth.js';
import { getBanStatus } from './middleware/ban.js';
import vipRouter, { VIP_TIERS } from './routes/vip.js';
import adminRouter from './routes/admin.js';
import paymentsRouter from './routes/payments.js';
import { generalLimiter, authLimiter } from './middleware/rateLimit.js';

const prisma = new PrismaClient();

const app = express();

// Trust the first proxy hop (Render, nginx, etc.) so that express-rate-limit
// can read the real client IP from the X-Forwarded-For header correctly.
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Faqat aniq domenlardan kelgan so'rovlarga ruxsat beramiz — avval istalgan domendan
// so'rov qabul qilinardi, bu endi cheklandi. FRONTEND_ORIGIN Render Environment'da
// (masalan https://stars-shop.uz) sozlanishi kerak, aks holda faqat dev/localhost ishlaydi.
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN, // masalan: https://stars-shop.uz
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // origin bo'lmasa (masalan server-to-server so'rov, curl, Postman) — ruxsat beramiz
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Ruxsat berilmagan domendan so'rov: ${origin}`);
    return callback(new Error('CORS: bu domenga ruxsat berilmagan'));
  },
  credentials: true,
}));

app.use(express.json());
app.use('/api/', generalLimiter); // barcha API uchun umumiy chegara

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Skin Marketplace routes (listings, inventory, buy/sell escrow flow)
app.use('/api/v1/market', marketRouter);

// VIP purchase routes
app.use('/api/v1/vip', vipRouter);

// Admin panel routes (requires auth + admin check inside the router)
app.use('/api/v1/admin', adminRouter);

// inPAY to'lov routes (create invoice, webhook, status polling)
app.use('/api/v1/payments/inpay', paymentsRouter);

// Ban holatini tekshirish — frontend login'dan keyin shu orqali banner ko'rsatadi
app.get('/api/v1/auth/ban-status', requireAuth, async (req, res) => {
  const status = await getBanStatus(req.user.steamId);
  res.json({ success: true, ...status });
});

// Health check — inPAY konfiguratsiyasini ham tekshiradi
app.get('/api/v1/health', (req, res) => {
  const inpayMerchantId = process.env.INPAY_MERCHANT_ID;
  const inpayToken = process.env.INPAY_MERCHANT_TOKEN;
  res.json({ 
    status: 'ok', 
    service: 'StarsCS Backend API', 
    steamApiConfigured: !!process.env.STEAM_API_KEY,
    inpay: {
      merchantIdSet: !!inpayMerchantId,
      merchantTokenSet: !!inpayToken,
      merchantTokenLength: inpayToken ? inpayToken.length : 0,
      callbackUrl: process.env.INPAY_CALLBACK_URL || 'NOT SET',
    },
    timestamp: new Date().toISOString() 
  });
});

// Servers API
app.get('/api/v1/servers', (req, res) => {
  const { mode } = req.query;
  let result = db.servers;
  if (mode && mode !== 'all') {
    result = result.filter(s => s.mode.toLowerCase() === mode.toLowerCase());
  }
  const totalOnline = db.servers.reduce((sum, s) => sum + s.onlinePlayers, 0);
  res.json({ success: true, totalOnline, servers: result });
});

// Store API — VIP tariflari endi vip.js'dagi yagona manbadan keladi (narx mos kelmasligi bo'lmaydi)
app.get('/api/v1/store', (req, res) => {
  const tiers = Object.entries(VIP_TIERS).map(([id, t]) => ({ id, ...t }));
  res.json({ success: true, items: tiers });
});

// Leaderboard API — endi haqiqiy Prisma User jadvalidan, score bo'yicha saralangan
function levelToBadge(level) {
  if (level >= 40) return 'Diamond';
  if (level >= 25) return 'Gold';
  if (level >= 10) return 'Silver';
  return 'Bronze';
}

app.get('/api/v1/leaderboard', async (req, res) => {
  const { search } = req.query;
  try {
    const users = await prisma.user.findMany({
      where: search ? { displayName: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { score: 'desc' },
      take: 100,
    });

    const players = users.map((u, i) => ({
      rank: i + 1,
      name: u.displayName,
      kills: u.kills,
      deaths: u.deaths,
      kd: u.deaths > 0 ? (u.kills / u.deaths).toFixed(2) : u.kills.toFixed(2),
      headshots: `${u.headshotPct.toFixed(0)}%`,
      winRate: `${u.winRate.toFixed(0)}%`,
      rankBadge: levelToBadge(u.level),
    }));

    res.json({ success: true, players });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bans API — endi haqiqiy Prisma BanRecord jadvalidan
app.get('/api/v1/bans', async (req, res) => {
  try {
    const records = await prisma.banRecord.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const bans = records.map((b) => ({
      id: b.id,
      name: b.user.displayName,
      steamId: b.user.steamId,
      date: b.createdAt.toISOString().slice(0, 10),
      admin: b.bannedBy,
      reason: b.reason,
      status: (!b.expiresAt || new Date(b.expiresAt) > new Date()) ? 'Active' : 'Expired',
    }));

    res.json({ success: true, bans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Submit Request (Admin apply / Unban appeal)
app.post('/api/v1/requests', async (req, res) => {
  const { name, telegram, type, message } = req.body;
  if (!name || !telegram || !message) {
    return res.status(400).json({ success: false, message: 'Barcha maydonlarni to\'ldiring' });
  }
  try {
    const ticket = await prisma.requestTicket.create({
      data: { name, telegram, type: type || 'other', message },
    });
    res.json({ success: true, message: 'Murojaatingiz qabul qilindi!', ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// [Legacy] Payme stub — backwards compatibility uchun qoldirildi.
// Yangi integratsiya uchun POST /api/v1/payments/inpay/create dan foydalaning.
app.post('/api/v1/payments/payme/create', (req, res) => {
  res.status(410).json({
    success: false,
    message: "Bu endpoint eskirgan. Iltimos /api/v1/payments/inpay/create dan foydalaning.",
    error_code: 'DEPRECATED',
  });
});

// ----------------------------------------------------
// Steam Web API & OpenID 2.0 Real Authentication Routes
// ----------------------------------------------------

// Known production frontend — used whenever we can't reliably detect the caller's origin
const PRODUCTION_FRONTEND_URL = 'https://stars-shop.uz';

// Generate Steam OpenID Login URL
app.get('/api/v1/auth/steam/login-url', authLimiter, (req, res) => {
  let clientOrigin = '';
  if (req.query.frontend) {
    try { clientOrigin = new URL(decodeURIComponent(req.query.frontend)).origin; } catch (e) {}
  }
  if (!clientOrigin) {
    const referer = req.headers.referer || req.headers.origin || '';
    try { if (referer) clientOrigin = new URL(referer).origin; } catch (e) {}
  }
  if (!clientOrigin) {
    clientOrigin = PRODUCTION_FRONTEND_URL;
  }

  const host = req.headers.host || 'localhost:5000';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const returnTo = `${protocol}://${host}/api/v1/auth/steam/callback` + (clientOrigin ? `?frontend=${encodeURIComponent(clientOrigin)}` : '');
  const realm = `${protocol}://${host}`;

  const openIdUrl = `https://steamcommunity.com/openid/login?` + new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  }).toString();

  res.json({ success: true, openIdUrl });
});

// Handle Steam OpenID Redirect Callback
app.get('/api/v1/auth/steam/callback', async (req, res) => {
  const host = req.headers.host || 'localhost:5000';
  
  let frontendOrigin = req.query.frontend
    ? decodeURIComponent(req.query.frontend)
    : PRODUCTION_FRONTEND_URL;
  if (frontendOrigin.includes('localhost:5000') || frontendOrigin.includes('onrender.com')) {
    frontendOrigin = host.includes('localhost') ? 'http://localhost:5173' : PRODUCTION_FRONTEND_URL;
  }

  try {
    const claimedId = req.query['openid.claimed_id'] || req.query['openid.identity'] || '';
    let steamId64 = '';

    if (claimedId) {
      const matches = claimedId.match(/\/id\/(\d+)/);
      if (matches && matches[1]) {
        steamId64 = matches[1];
      }
    }

    if (!steamId64) {
      throw new Error("SteamID topilmadi yoki OpenID ma'lumotlari noto'g'ri");
    }

    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId64}`;
    let displayName = `Player_${steamId64.slice(-4)}`;
    let avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId64}`;

    try {
      const apiResponse = await fetch(steamApiUrl);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const player = data.response?.players?.[0];
        if (player) {
          displayName = player.personaname;
          avatarUrl = player.avatarfull;
        }
      }
    } catch (e) {
      console.log('Steam API fetch fallback');
    }

    // Upsert into Prisma DB — creates the user on first login, updates profile fields on repeat logins.
    // Balance/vipRole are only set on CREATE (never overwritten on repeat logins, so purchases/VIP aren't reset).
    const userRecord = await prisma.user.upsert({
      where: { steamId: steamId64 },
      update: { displayName, avatarUrl },
      create: {
        steamId: steamId64,
        displayName,
        avatarUrl,
        balance: 0,
        vipRole: "Oddiy O'yinchi",
      },
    });

    const token = generateToken(steamId64);

    const redirectUrl = `${frontendOrigin}/?steamAuth=success&steamId=${steamId64}&name=${encodeURIComponent(userRecord.displayName)}&avatar=${encodeURIComponent(userRecord.avatarUrl)}&balance=${userRecord.balance}&vipRole=${encodeURIComponent(userRecord.vipRole)}&token=${encodeURIComponent(token)}`;
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("Steam Login Xatoligi:", error.message);
    return res.redirect(`${frontendOrigin}/?steamAuth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Fetch Profile of Authenticated User
app.get('/api/v1/auth/steam/user/:steamId', requireAuth, async (req, res) => {
  try {
    const { steamId } = req.params;

    if (req.user.steamId !== steamId) {
      return res.status(403).json({ success: false, message: "Faqat o'z profilingiz ma'lumotlarini ko'ra olasiz" });
    }

    const existing = await prisma.user.findUnique({ where: { steamId } });
    if (existing) {
      return res.json({
        success: true,
        source: 'database',
        user: existing
      });
    }

    return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save or Update User Profile directly in Database
app.post('/api/v1/auth/steam/sync', requireAuth, async (req, res) => {
  const steamId = req.user.steamId;
  // MUHIM: balance va vipRole client'dan HECH QACHON qabul qilinmaydi — bular faqat
  // server tomonidan (haqiqiy to'lov/VIP xarid endpoint'lari orqali) o'zgartiriladi.
  // Aks holda, har kim o'ziga cheksiz balans/VIP bera olardi.
  const { displayName, avatarUrl } = req.body;

  try {
    const userRecord = await prisma.user.upsert({
      where: { steamId },
      update: {
        ...(displayName && { displayName }),
        ...(avatarUrl && { avatarUrl }),
      },
      create: {
        steamId,
        displayName: displayName || `Player_${steamId.slice(-4)}`,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`,
        balance: 0,
        vipRole: "Oddiy O'yinchi",
      },
    });

    res.json({
      success: true,
      message: "Foydalanuvchi ma'lumotlar bazasiga saqlandi",
      user: userRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Global xato ushlagich ───────────────────────────────────────────────
// Bu — ZANJIRDAGI ENG OXIRGI middleware bo'lishi kerak (barcha route'lardan keyin).
// Agar biror route'da kutilmagan xato yuz bersa (masalan Prisma ulanish uzilishi),
// bu yerda ushlanadi: foydalanuvchiga tushunarli xabar, serverga esa to'liq log yoziladi.
// MUHIM: foydalanuvchiga hech qachon xato stack-trace yoki ichki tafsilotlar
// ko'rsatilmaydi — bu xavfsizlik uchun muhim (ichki tuzilma oshkor bo'lmasligi kerak).
app.use((err, req, res, next) => {
  console.error(`[XATO] ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    message: 'Server xatosi yuz berdi. Birozdan keyin qayta urinib ko\'ring.',
  });
});

// Noma'lum yo'l (route topilmasa) — standart Express "Cannot GET" o'rniga tushunarli JSON
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'So\'ralgan manzil topilmadi' });
});

// Kutilmagan (ushlanmagan) xatolar — serverni "jim" yiqilib qolishdan saqlaydi,
// to'liq log yozadi. uncaughtException'dan keyin holat noaniq bo'lishi mumkin,
// shuning uchun process'ni tugatamiz — Render buni avtomatik qayta ishga tushiradi.
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION] Server qayta ishga tushirilmoqda:', err);
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`🚀 StarsCS Backend REST API listening on http://localhost:${PORT}`);
});

// Boot the Steam trade bot and start watching escrow trade offer states.
startBot();
registerTradeStateWatcher();
startEscrowReleaseChecker();
