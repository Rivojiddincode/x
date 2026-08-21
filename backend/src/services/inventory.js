// StarsCS Skin Marketplace — Inventory Service
// Fetches a user's CS2 inventory using the bot's authenticated Steam session.
//
// IMPORTANT: we deliberately do NOT use a plain anonymous fetch() to
// steamcommunity.com/inventory/... — Steam aggressively rate-limits/blocks
// anonymous requests coming from datacenter IPs (like Render's), often
// returning 401 even for fully public inventories. Routing the request
// through the bot's already-authenticated SteamCommunity session avoids this.

import { community, isBotReady } from './steamBot.js';
import { decodeLink } from '@csfloat/cs2-inspect-serializer';

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
        // getUserInventoryContents — BUT we now call it with tradableOnly=false (see below)
        // so we can also show cooldown items (grayed out) instead of hiding them entirely.
        tradable: item.tradable !== false,
        marketable: !!item.marketable,
        type: item.type || '',
        // `owner_descriptions` / `descriptions` sometimes carry the human-readable
        // cooldown text Steam itself shows ("Tradable After <date>"). We surface it
        // as-is so the frontend can display it; if absent, tradable=false items just
        // show a generic "cooldown'da" label.
        // `cache_expiration` — bu Steam'ning haqiqiy maydoni, trade cooldown tugaydigan
        // aniq sana-vaqtni beradi (CS2 itemlari uchun). Description matnidan qidirishdan
        // ko'ra ancha ishonchli.
        cooldownUntil: item.cache_expiration || null,
        cooldownText: item.cache_expiration
          ? `${new Date(item.cache_expiration).toLocaleDateString('uz-UZ')} gacha`
          : (item.tradable === false
            ? (item.descriptions || item.owner_descriptions || [])
                .map((d) => d.value)
                .find((v) => typeof v === 'string' && /trad(e|able)/i.test(v)) || 'Trade cooldown\'da'
            : null),
        inspectLink: buildInspectLink(item.actions, steamId64, item.assetid || item.id),
      }));

      // Endi hech narsani filtrlamaymiz — cooldown'dagi (tradable=false) itemlar ham
      // ro'yxatda qoladi, frontend ularni xira holatda ko'rsatadi.
      resolve(items);
    });
  });
}

// Float keshi — har item uchun 30 daqiqa (float o'zgarmaydi, lekin API'ni ortiqcha yuklamaslik uchun)
const floatCache = new Map(); // assetId -> { data, fetchedAt }
const FLOAT_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Steam item'ning "actions" massivida "Inspect in Game..." havolasi bo'ladi,
 * ichida %owner_steamid% va %assetid% o'rniga qo'yiladigan shablon sifatida.
 * Buni haqiqiy qiymatlar bilan to'ldirib, ochiq CSGOFloat API'ga yuboramiz.
 */
export function buildInspectLink(rawActions, steamId64, assetId) {
  if (!rawActions || !rawActions.length) return null;
  const inspectAction = rawActions.find((a) => a.link && a.link.includes('csgo_econ_action_preview'));
  if (!inspectAction) return null;
  return inspectAction.link
    .replace('%owner_steamid%', steamId64)
    .replace('%assetid%', assetId);
}

/**
 * Ochiq CSGOFloat inspect API orqali float qiymati va paint seed'ni oladi.
 * 2026-yildan boshlab CS2 inspect linklar o'z ichida (self-encoded) float/paint seed
 * ma'lumotini to'g'ridan-to'g'ri saqlaydi — shuning uchun avval MAHALLIY dekodlashga
 * urinamiz (tashqi so'rov kerak emas, tezroq va ishonchli). Faqat link "eski" (pointer)
 * formatda bo'lsa, tashqi API'ga murojaat qilamiz — lekin 2026-yilda Steam Game
 * Coordinator'dagi uzilishlar tufayli bu variant ishlamasligi mumkin.
 */
export async function fetchFloatData(inspectLink, assetId) {
  if (!inspectLink) return null;

  const cached = floatCache.get(assetId);
  if (cached && Date.now() - cached.fetchedAt < FLOAT_CACHE_TTL_MS) {
    return cached.data;
  }

  // 1-urinish: mahalliy dekodlash (tashqi so'rovsiz, tezkor)
  try {
    const decoded = decodeLink(inspectLink);
    if (decoded && typeof decoded.paintwear === 'number') {
      const result = {
        floatValue: decoded.paintwear,
        paintSeed: decoded.paintseed,
        paintIndex: decoded.paintindex,
      };
      floatCache.set(assetId, { data: result, fetchedAt: Date.now() });
      return result;
    }
  } catch (e) {
    // Link "eski" (self-encode qilinmagan, faqat pointer) formatda — pastdagi fallback'ga o'tamiz
  }

  // 2-urinish (zaxira): tashqi API — faqat eski uslubdagi linklar uchun kerak bo'ladi
  try {
    const url = `https://api.csgofloat.com/?url=${encodeURIComponent(inspectLink)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (StarsCS Float Fetcher)' } });
    if (!res.ok) {
      floatCache.set(assetId, { data: null, fetchedAt: Date.now() });
      return null;
    }
    const data = await res.json();
    const info = data.iteminfo;
    if (!info) {
      floatCache.set(assetId, { data: null, fetchedAt: Date.now() });
      return null;
    }
    const result = {
      floatValue: info.floatvalue,
      paintSeed: info.paintseed,
      wearName: info.wear_name,
      min: info.min,
      max: info.max,
    };
    floatCache.set(assetId, { data: result, fetchedAt: Date.now() });
    return result;
  } catch (e) {
    floatCache.set(assetId, { data: null, fetchedAt: Date.now() });
    return null;
  }
}

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
 * currency=507 => UZS — Steam rasmiy ravishda UZS ni qo'llab-quvvatlaydi.
 * Qaytarilgan qiymat UZS da butun son (so'm).
 */
export async function fetchMarketPrice(marketHashName) {
  const cached = priceCache.get(marketHashName);
  if (cached && Date.now() - cached.fetchedAt < PRICE_CACHE_TTL_MS) {
    return cached.price;
  }

  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=507&market_hash_name=${encodeURIComponent(marketHashName)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (StarsCS Price Fetcher)' } });

  if (!res.ok) {
    priceCache.set(marketHashName, { price: null, fetchedAt: Date.now() });
    return null;
  }

  const data = await res.json();
  // lowest_price masalan "65 400,00 UZS" yoki "65 400 p." ko'rinishida keladi.
  // Vergul tiyin ajratgichi bo'lgani uchun avval nuqtaga o'tkaziladi, keyin faqat raqam va nuqta olinadi.
  const raw = data.lowest_price || data.median_price;
  let numeric = null;
  if (raw) {
    const cleaned = String(raw).trim().replace(/,([0-9]{2})$/, '.$1').replace(/[^0-9.]/g, '');
    const val = Number(cleaned);
    if (!isNaN(val)) numeric = Math.round(val);
  }

  priceCache.set(marketHashName, { price: numeric, fetchedAt: Date.now() });
  return numeric; // UZS
}
