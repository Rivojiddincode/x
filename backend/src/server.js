import express from 'express';
import cors from 'cors';
import { db } from './services/db.js';

const app = express();
const PORT = process.env.PORT || 5000;
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'B677B149ED047B15E06644583D97A937';

app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

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
  res.json({ success: true, message: 'Murojaat qabul qilindi!', ticket });
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

// Generate Steam OpenID Login URL
app.get('/api/v1/auth/steam/login-url', (req, res) => {
  const host = req.headers.host || 'stars-shop.uz';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const returnTo = `${protocol}://${host}/api/v1/auth/steam/callback`;
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
  try {
    const claimedId = req.query['openid.claimed_id'];
    if (!claimedId) {
      return res.status(400).send('Steam avtorizatsiyasi bekor qilindi.');
    }

    // Extract 64-bit Steam ID from OpenID claimed_id URL (e.g. https://steamcommunity.com/openid/id/76561198012345678)
    const matches = claimedId.match(/\/id\/(\d+)$/);
    if (!matches || !matches[1]) {
      return res.status(400).send('Yaroqsiz Steam ID format.');
    }

    const steamId64 = matches[1];

    // Fetch real user profile from Steam Web API v2
    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId64}`;
    const response = await fetch(steamApiUrl);
    const data = await response.json();

    const player = data.response?.players?.[0];
    const displayName = player ? player.personaname : `Player_${steamId64.slice(-4)}`;
    const avatarUrl = player ? player.avatarfull : `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId64}`;

    const userObj = {
      steamId: steamId64,
      displayName,
      avatarUrl,
      profileUrl: player?.profileurl || `https://steamcommunity.com/profiles/${steamId64}`,
      balance: 50000,
      vipRole: 'VIP Diamond'
    };

    // Store user session in memory/db
    db.users[steamId64] = userObj;

    const host = req.headers.host || 'stars-shop.uz';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const redirectUrl = `${protocol}://${host}/?steamAuth=success&steamId=${steamId64}&name=${encodeURIComponent(displayName)}&avatar=${encodeURIComponent(avatarUrl)}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Steam Auth Error:', error);
    res.status(500).send('Steam serveriga ulanishda xatolik yuz berdi.');
  }
});

// Fetch Profile by Steam ID via Steam Web API
app.get('/api/v1/auth/steam/user/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(steamApiUrl);
    const data = await response.json();

    const player = data.response?.players?.[0];
    if (!player) {
      return res.status(444).json({ success: false, message: 'Steam foydalanuvchisi topilmadi' });
    }

    res.json({
      success: true,
      user: {
        steamId,
        displayName: player.personaname,
        avatarUrl: player.avatarfull,
        profileUrl: player.profileurl,
        communityVisibilityState: player.communityvisibilitystate
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Legacy Quick Auth Simulation
app.post('/api/v1/auth/steam', (req, res) => {
  res.json({
    success: true,
    user: {
      steamId: '76561198012345678',
      displayName: 'Chapanic',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Chapanic',
      balance: 150000,
      vipRole: 'VIP Diamond'
    },
    token: 'jwt_mock_token_srtrscs_2026'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 StarsCS Backend REST API listening on http://localhost:${PORT}`);
});
