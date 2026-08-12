import express from 'express';
import cors from 'cors';
import { db } from './services/db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'SrtrsCS Backend API', timestamp: new Date().toISOString() });
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

// Steam Auth Simulation
app.post('/api/v1/auth/steam', (req, res) => {
  res.json({
    success: true,
    user: {
      steamId: 'STEAM_1:0:9823412',
      displayName: 'Chapanic',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Chapanic',
      balance: 150000,
      vipRole: 'VIP Diamond'
    },
    token: 'jwt_mock_token_srtrscs_2026'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SrtrsCS Backend REST API listening on http://localhost:${PORT}`);
});
