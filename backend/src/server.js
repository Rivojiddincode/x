import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './services/db.js';

const app = express();
const PORT = process.env.PORT || 5000;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

if (!STEAM_API_KEY) {
  console.warn('⚠️ WARNING: STEAM_API_KEY environment variable is missing! Please configure it in your .env file.');
}

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
    steamApiConfigured: !!STEAM_API_KEY, 
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

// Secure Steam OpenID Redirect Callback Handler with check_authentication Verification
app.get('/api/v1/auth/steam/callback', async (req, res) => {
  const host = req.headers.host || 'stars-shop.uz';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const frontendOrigin = `${protocol}://${host}`;

  try {
    // 1. Cryptographically verify OpenID response directly with Steam servers
    const verifyParams = new URLSearchParams(req.query);
    verifyParams.set('openid.mode', 'check_authentication');

    const verifyRes = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString()
    });

    const verifyText = await verifyRes.text();
    if (!verifyText.includes('is_valid:true')) {
      throw new Error("Steam javobi tasdiqlanmadi — soxta so'rov ehtimoli!");
    }

    // 2. Extract verified 64-bit SteamID from openid.claimed_id URL
    const claimedId = req.query['openid.claimed_id'];
    let steamId64 = '';

    if (claimedId) {
      const matches = claimedId.match(/\/id\/(\d+)$/);
      if (matches && matches[1]) {
        steamId64 = matches[1];
      }
    }

    if (!steamId64) {
      throw new Error("SteamID topilmadi yoki OpenID ma'lumotlari noto'g'ri");
    }

    // 3. Fetch real user profile from Steam Web API v2
    let displayName = `Player_${steamId64.slice(-4)}`;
    let avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId64}`;

    if (STEAM_API_KEY) {
      const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId64}`;
      const apiResponse = await fetch(steamApiUrl);
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const player = data.response?.players?.[0];
        if (player) {
          displayName = player.personaname || displayName;
          avatarUrl = player.avatarfull || avatarUrl;
        }
      }
    }

    // 4. Secure Default User Setup (balance: 0, vipRole: 'Oddiy O\'yinchi')
    const userObj = db.users[steamId64] || {
      steamId: steamId64,
      displayName,
      avatarUrl,
      profileUrl: `https://steamcommunity.com/profiles/${steamId64}`,
      balance: 0, // SECURE: Starts with 0 UZS
      vipRole: "Oddiy O'yinchi" // SECURE: Starts without free VIP
    };

    db.users[steamId64] = userObj;

    // 5. Redirect to Frontend with Verified User Parameters
    const redirectUrl = `${frontendOrigin}/?steamAuth=success&steamId=${steamId64}&name=${encodeURIComponent(displayName)}&avatar=${encodeURIComponent(avatarUrl)}&balance=${userObj.balance}&vipRole=${encodeURIComponent(userObj.vipRole)}`;
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("Steam Login Verification Error:", error.message);
    return res.redirect(`${frontendOrigin}/?steamAuth=error&message=${encodeURIComponent(error.message)}`);
  }
});

// Fetch Profile by Steam ID via Steam Web API
app.get('/api/v1/auth/steam/user/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const existingUser = db.users[steamId];

    if (!STEAM_API_KEY) {
      return res.json({
        success: true,
        user: existingUser || {
          steamId,
          displayName: `Player_${steamId.slice(-4)}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`,
          balance: 0,
          vipRole: "Oddiy O'yinchi"
        }
      });
    }

    const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(steamApiUrl);
    const data = await response.json();

    const player = data.response?.players?.[0];
    if (!player) {
      return res.status(404).json({ success: false, message: 'Steam foydalanuvchisi topilmadi' });
    }

    res.json({
      success: true,
      user: {
        steamId,
        displayName: player.personaname,
        avatarUrl: player.avatarfull,
        profileUrl: player.profileurl,
        balance: existingUser ? existingUser.balance : 0,
        vipRole: existingUser ? existingUser.vipRole : "Oddiy O'yinchi"
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 StarsCS Backend REST API listening on http://localhost:${PORT}`);
});
