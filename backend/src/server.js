import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { db } from './services/db.js';
import marketRouter, { registerTradeStateWatcher, startEscrowReleaseChecker } from './routes/marketplace.js';
import { startBot } from './services/steamBot.js';

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 5000;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Skin Marketplace routes (listings, inventory, buy/sell escrow flow)
app.use('/api/v1/market', marketRouter);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'StarsCS Backend API', 
    steamApiConfigured: true, 
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

// Store API
app.get('/api/v1/store', (req, res) => {
  res.json({ success: true, items: db.storeItems });
});

// Leaderboard API
app.get('/api/v1/leaderboard', (req, res) => {
  const { search } = req.query;
  let result = db.leaderboard;
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p => p.name.toLowerCase().includes(q) || p.rankBadge.toLowerCase().includes(q));
  }
  res.json({ success: true, players: result });
});

// Bans API
app.get('/api/v1/bans', (req, res) => {
  res.json({ success: true, bans: db.bans });
});

// Submit Request (Admin apply / Unban appeal)
app.post('/api/v1/requests', (req, res) => {
  const { name, telegram, type, message } = req.body;
  if (!name || !telegram || !message) {
    return res.status(400).json({ success: false, message: 'Barcha maydonlarni to\'ldiring' });
  }
  const ticket = { id: Date.now(), name, telegram, type, message, createdAt: new Date() };
  db.requests.push(ticket);
  res.json({ success: true, message: 'Murojaatingiz qabul qilindi!', ticket });
});

// Payme Top-Up Merchant URL Generator & Checkout
app.post('/api/v1/payments/payme/create', (req, res) => {
  const { steamId, amount, promo } = req.body;
  if (!steamId || !amount || amount < 1000) {
    return res.status(400).json({ success: false, message: 'Yaroqsiz Steam ID yoki summa' });
  }
  
  const paymentId = `PAYME-${Date.now()}`;
  const checkoutUrl = `https://payme.uz/fallback/merchant/?id=69eb58c2229f5694d603f48d&amount=${amount * 100}&account[steamId]=${steamId}`;
  
  db.payments.push({ id: paymentId, steamId, amount, promo, status: 'PENDING', createdAt: new Date() });
  
  res.json({
    success: true,
    paymentId,
    amount,
    checkoutUrl,
    message: 'Payme to\'lov ssilkasi muvaffaqiyatli yaratildi!'
  });
});

// ----------------------------------------------------
// Steam Web API & OpenID 2.0 Real Authentication Routes
// ----------------------------------------------------

// Known production frontend — used whenever we can't reliably detect the caller's origin
const PRODUCTION_FRONTEND_URL = 'https://stars-shop.uz';

// Generate Steam OpenID Login URL
app.get('/api/v1/auth/steam/login-url', (req, res) => {
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

    const redirectUrl = `${frontendOrigin}/?steamAuth=success&steamId=${steamId64}&name=${encodeURIComponent(userRecord.displayName)}&avatar=${encodeURIComponent(userRecord.avatarUrl)}&balance=${userRecord.balance}&vipRole=${encodeURIComponent(userRecord.vipRole)}`;
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("Steam Login Xatoligi:", error.message);
    return res.redirect(`${frontendOrigin}/?steamAuth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Fetch Profile by Steam ID from Database
app.get('/api/v1/auth/steam/user/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;

    const existing = await prisma.user.findUnique({ where: { steamId } });
    if (existing) {
      return res.json({
        success: true,
        source: 'database',
        user: existing
      });
    }

    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(steamApiUrl);
    const data = await response.json();

    const player = data.response?.players?.[0];
    const userRecord = await prisma.user.create({
      data: {
        steamId,
        displayName: player ? player.personaname : `Player_${steamId.slice(-4)}`,
        avatarUrl: player ? player.avatarfull : `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`,
        balance: 0,
        vipRole: "Oddiy O'yinchi",
      },
    });

    res.json({
      success: true,
      source: 'steam_api',
      user: userRecord
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save or Update User Profile directly in Database
app.post('/api/v1/auth/steam/sync', async (req, res) => {
  const { steamId, displayName, avatarUrl, balance, vipRole } = req.body;
  if (!steamId) {
    return res.status(400).json({ success: false, message: 'Steam ID kiritilmadi' });
  }

  try {
    const userRecord = await prisma.user.upsert({
      where: { steamId },
      update: {
        ...(displayName && { displayName }),
        ...(avatarUrl && { avatarUrl }),
        ...(balance !== undefined && { balance }),
        ...(vipRole && { vipRole }),
      },
      create: {
        steamId,
        displayName: displayName || `Player_${steamId.slice(-4)}`,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`,
        balance: balance ?? 0,
        vipRole: vipRole || "Oddiy O'yinchi",
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

app.listen(PORT, () => {
  console.log(`🚀 StarsCS Backend REST API listening on http://localhost:${PORT}`);
});

// Boot the Steam trade bot and start watching escrow trade offer states.
startBot();
registerTradeStateWatcher();
startEscrowReleaseChecker();
