// StarsCS Skin Marketplace — Inventory Service
// Fetches a user's CS2 inventory using the bot's authenticated Steam session.
//
// IMPORTANT: we deliberately do NOT use a plain anonymous fetch() to
// steamcommunity.com/inventory/... — Steam aggressively rate-limits/blocks
// anonymous requests coming from datacenter IPs (like Render's), often
// returning 401 even for fully public inventories. Routing the request
// through the bot's already-authenticated SteamCommunity session avoids this.

import { community, isBotReady } from './steamBot.js';

const CS2_APP_ID = 730;
const CS2_CONTEXT_ID = 2;

export async function fetchInventory(steamId64) {
  if (!isBotReady()) {
    throw new Error('Bot hali Steam\'ga ulanmagan, birozdan keyin qayta urinib ko\'ring');
  }

  return new Promise((resolve, reject) => {
    // tradableOnly=false — barcha itemlarni olamiz, shu jumladan trade-cooldown'dagilarni ham,
    // shunda ularni ro'yxatdan butunlay yashirish o'rniga frontend'da xira holatda ko'rsatamiz.
    community.getUserInventoryContents(steamId64, CS2_APP_ID, CS2_CONTEXT_ID, false, (err, inventory) => {
      if (err) {
        console.error('[inventory] Steam xatosi:', err.message, err);
        return reject(new Error(err.message || 'Steam inventarni qaytarmadi'));
      }

      console.log('[inventory] Steam\'dan xom (raw) natija:', JSON.stringify(inventory)?.slice(0, 500));
      console.log('[inventory] Jami item soni:', (inventory || []).length);

      const items = (inventory || []).map((item) => ({
        assetId: item.assetid || item.id,
        classId: item.classid,
        instanceId: item.instanceid,
        marketHashName: item.market_hash_name || 'Noma\'lum item',
        iconUrl: item.icon_url ? `https://community.akamai.steamstatic.com/economy/image/${item.icon_url}` : '',
        // Steam already filtered to tradable-only when tradableOnly=true was passed to
        // getUserInventoryContents — BUT we now call it with tradableOnly=false
        // so we can also show cooldown items (grayed out) instead of hiding them entirely.
        tradable: item.tradable !== false,
        marketable: !!item.marketable,
        type: item.type || '',
        // `owner_descriptions` / `descriptions` sometimes carry the human-readable
        // cooldown text Steam itself shows ("Tradable After <date>"). We surface it
        // as-is so the frontend can display it; if absent, tradable=false items just
        // show a generic "cooldown'da" label.
        cooldownText: (item.descriptions || item.owner_descriptions || [])
          .map((d) => d.value)
          .find((v) => typeof v === 'string' && /trad(e|able)/i.test(v)) || null,
      }));

      // Endi hech narsani filtrlamaymiz — cooldown'dagi (tradable=false) itemlar ham
      // ro'yxatda qoladi, frontend ularni xira holatda ko'rsatadi.
      resolve(items);
    });
  });
}

/**
 * Trade URL formatini tekshirish va undan partner/token qismini chiqarib olish.
 */
export function parseTradeUrl(tradeUrl) {
  try {
    const url = new URL(tradeUrl);
    const partner = url.searchParams.get('partner');
    const token = url.searchParams.get('token');
    if (!partner || !token) return null;
    return { partner, token };
  } catch (e) {
    return null;
  }
}

/**
 * SteamID64'dan Steam "accountId"ni hisoblaydi — bu son trade link'dagi
 * `partner` parametri bilan bir xil bo'lishi kerak (Steam shunday generatsiya qiladi).
 * Buning yordamida trade link haqiqatan shu steamId'ga tegishli ekanini
 * Steam'ga so'rov yubormasdan tekshirish mumkin.
 */
export function steamId64ToAccountId(steamId64) {
  const STEAM_ID64_BASE = 76561197960265728n;
  return (BigInt(steamId64) - STEAM_ID64_BASE).toString();
}

/**
 * Trade link berilgan steamId'ga haqiqatan tegishli ekanini tekshiradi.
 */
export function isTradeUrlOwnedBySteamId(tradeUrl, steamId64) {
  const parsed = parseTradeUrl(tradeUrl);
  if (!parsed) return false;
  return parsed.partner === steamId64ToAccountId(steamId64);
}

// Steam narxlarini juda tez-tez so'rasa, Steam so'rovlarni bloklaydi —
// shuning uchun har bir item narxini 10 daqiqaga keshda saqlaymiz.
const priceCache = new Map(); // marketHashName -> { price, fetchedAt }
const PRICE_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Steam Community Market'dan berilgan item uchun hozirgi (eng past sotuv) narxini oladi.
 * currency=1 => USD.
 */
export async function fetchMarketPrice(marketHashName) {
  const cached = priceCache.get(marketHashName);
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.price;
  }

  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (StarsCS Price Fetcher)' } });

  if (!res.ok) {
    priceCache.set(marketHashName, { price: null, fetchedAt: Date.now() });
    return null;
  }

  const data = await res.json();
  // lowest_price masalan "$12.34" ko'rinishida keladi — raqamga o'giramiz
  const raw = data.lowest_price || data.median_price;
  const numeric = raw ? Number(String(raw).replace(/[^0-9.]/g, '')) : null;

  priceCache.set(marketHashName, { price: numeric, fetchedAt: Date.now() });
  return numeric;
}
