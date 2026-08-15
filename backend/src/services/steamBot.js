// StarsCS Skin Marketplace — Steam Trade Bot Service
//
// This service logs a dedicated Steam account ("the bot") into Steam and uses it
// as an escrow intermediary between a seller and a buyer:
//   1. Bot requests the item FROM the seller (seller must accept in their Steam client)
//   2. Once bot receives it, bot sends the item TO the buyer
//   3. Trade confirmations (Steam Guard Mobile) are accepted automatically using
//      BOT_IDENTITY_SECRET — no human needs to tap "confirm" on a phone.
//
// All secrets are read from environment variables ONLY. Never hardcode them here.

import SteamUser from 'steam-user';
import SteamCommunity from 'steamcommunity';
import TradeOfferManager from 'steam-tradeoffer-manager';
import SteamTotp from 'steam-totp';

const REQUIRED_ENV = ['BOT_ACCOUNT_NAME', 'BOT_PASSWORD', 'BOT_SHARED_SECRET', 'BOT_IDENTITY_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.warn(`[steamBot] Ogohlantirish: ${key} .env da topilmadi — bot ishga tushmaydi.`);
  }
}

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
  steam: client,
  community: community,
  language: 'en',
  pollInterval: 15000, // trade holatini har 15 soniyada tekshiradi
});

let botReady = false;

function logOn() {
  if (!process.env.BOT_ACCOUNT_NAME || !process.env.BOT_PASSWORD) {
    console.warn('[steamBot] Bot credentials missing in .env — skipping bot login.');
    return;
  }

  const logOnOptions = {
    accountName: process.env.BOT_ACCOUNT_NAME,
    password: process.env.BOT_PASSWORD,
    twoFactorCode: process.env.BOT_SHARED_SECRET ? SteamTotp.generateAuthCode(process.env.BOT_SHARED_SECRET) : undefined,
  };
  client.logOn(logOnOptions);
}

client.on('loggedOn', () => {
  console.log('[steamBot] Steam\'ga muvaffaqiyatli kirildi:', process.env.BOT_ACCOUNT_NAME);
  client.setPersona(SteamUser.EPersonaState.Online);
});

client.on('webSession', (sessionID, cookies) => {
  manager.setCookies(cookies, (err) => {
    if (err) {
      console.error('[steamBot] Trade manager cookie xatosi:', err);
      return;
    }
    botReady = true;
    console.log('[steamBot] Trade Offer Manager tayyor.');
  });

  community.setCookies(cookies);

  // Mobile Authenticator tasdiqlashlarini avtomatik qabul qilish (identity_secret orqali)
  if (process.env.BOT_IDENTITY_SECRET) {
    community.startConfirmationChecker(20000, process.env.BOT_IDENTITY_SECRET);
  }
});

client.on('error', (err) => {
  console.error('[steamBot] Steam client xatosi:', err.message);
  botReady = false;
  // 30 soniyadan keyin qayta ulanishga harakat qiladi
  setTimeout(logOn, 30000);
});

client.on('disconnected', () => {
  console.warn('[steamBot] Steam\'dan uzildi, qayta ulanmoqda...');
  botReady = false;
});

export function isBotReady() {
  return botReady;
}

export function startBot() {
  logOn();
}

// ---------------------------------------------------------
// TRADE FUNCTIONS
// ---------------------------------------------------------

const CS2_APP_ID = 730;
const CS2_CONTEXT_ID = 2;

/**
 * Bot -> Sotuvchiga: "itemingizni menga (botga) yuboring" so'rovi.
 * Sotuvchi buni o'z Steam ilovasida qo'lda (yoki mobil push orqali) tasdiqlaydi.
 */
export function requestItemFromSeller({ sellerTradeUrl, assetId }) {
  return new Promise((resolve, reject) => {
    if (!botReady) return reject(new Error('Bot hali tayyor emas (Steam sessiyasi yo\'q)'));

    const offer = manager.createOffer(sellerTradeUrl);
    offer.addTheirItem({ assetid: assetId, appid: CS2_APP_ID, contextid: CS2_CONTEXT_ID });
    offer.setMessage('StarsCS: Skiningizni sotish uchun ushbu so\'rovni qabul qiling. Pul avtomatik balansingizga tushadi.');

    offer.send((err, status) => {
      if (err) return reject(err);
      resolve({ offerId: offer.id, status });
    });
  });
}

/**
 * Bot -> Xaridorga: itemni jo'natish (bot buni o'zi avtomatik tasdiqlaydi, identity_secret orqali).
 */
export function sendItemToBuyer({ buyerTradeUrl, assetId }) {
  return new Promise((resolve, reject) => {
    if (!botReady) return reject(new Error('Bot hali tayyor emas (Steam sessiyasi yo\'q)'));

    const offer = manager.createOffer(buyerTradeUrl);
    offer.addMyItem({ assetid: assetId, appid: CS2_APP_ID, contextid: CS2_CONTEXT_ID });
    offer.setMessage('StarsCS: Xaridingiz uchun rahmat! Yaxshi o\'yinlar.');

    offer.send((err, status) => {
      if (err) return reject(err);
      resolve({ offerId: offer.id, status });
    });
  });
}

/**
 * Trade offer holatini kuzatish uchun callback ro'yxatdan o'tkazish.
 * server.js yoki marketplace route'lari shu orqali "sotuvchi qabul qildi" / "xaridorga yetib bordi"
 * hodisalarini eshitib, DB'ni yangilaydi.
 */
export function onOfferStateChanged(handler) {
  manager.on('sentOfferChanged', (offer, oldState) => {
    handler({ offerId: offer.id, newState: offer.state, oldState, escrowEnds: offer.escrowEnds || null });
  });
}

export { manager, community, client };
