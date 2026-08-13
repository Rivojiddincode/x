// StarsCS Skin Marketplace — Inventory Service
//
// Strategy (dual-fetch):
//  1. Steam public JSON API — works for public inventories, no auth needed.
//     Returns ALL items (not just tradable), so users can see everything.
//  2. If Steam returns 403/empty AND bot is ready, fall back to bot session.

import { community, isBotReady } from './steamBot.js';

const CS2_APP_ID = 730;
const CS2_CONTEXT_ID = 2;

/**
 * Tries Steam's undocumented-but-stable public inventory endpoint.
 * Returns null if blocked/private, or the parsed item array.
 */
async function fetchViaPublicApi(steamId64) {
  const url = `https://steamcommunity.com/inventory/${steamId64}/${CS2_APP_ID}/${CS2_CONTEXT_ID}?l=english&count=5000`;
  console.log('[inventory] Public API request:', url);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://steamcommunity.com/',
    },
  });

  console.log('[inventory] Public API status:', res.status);
  if (!res.ok) return null;

  const data = await res.json();
  console.log('[inventory] Public API success=', data?.success, 'total_inventory_count=', data?.total_inventory_count);

  if (!data?.success || !data?.assets?.length) return null;

  // Build a description lookup keyed by classid+instanceid
  const descMap = {};
  for (const d of data.descriptions || []) {
    descMap[`${d.classid}_${d.instanceid}`] = d;
  }

  return data.assets.map((asset) => {
    const desc = descMap[`${asset.classid}_${asset.instanceid}`] || {};
    const iconUrl = desc.icon_url
      ? `https://community.akamai.steamstatic.com/economy/image/${desc.icon_url}`
      : '';
    return {
      assetId: asset.assetid,
      classId: asset.classid,
      instanceId: asset.instanceid,
      marketHashName: desc.market_hash_name || desc.name || 'Noma\'lum item',
      iconUrl,
      tradable: desc.tradable === 1,
      marketable: desc.marketable === 1,
      type: desc.type || '',
    };
  });
}

/**
 * Falls back to the bot's authenticated SteamCommunity session.
 * This bypasses Render's IP ban but requires the bot to be logged in.
 */
function fetchViaBotSession(steamId64) {
  return new Promise((resolve, reject) => {
    // tradableOnly=false — show ALL items so the user can see their inventory
    community.getUserInventoryContents(steamId64, CS2_APP_ID, CS2_CONTEXT_ID, false, (err, inventory) => {
      if (err) {
        console.error('[inventory] Bot session xatosi:', err.message);
        return reject(new Error(err.message || 'Steam inventarni qaytarmadi'));
      }
      console.log('[inventory] Bot session item soni:', (inventory || []).length);
      const items = (inventory || []).map((item) => ({
        assetId: item.assetid || item.id,
        classId: item.classid,
        instanceId: item.instanceid,
        marketHashName: item.market_hash_name || 'Noma\'lum item',
        iconUrl: item.icon_url
          ? `https://community.akamai.steamstatic.com/economy/image/${item.icon_url}`
          : '',
        tradable: item.tradable !== false,
        marketable: !!item.marketable,
        type: item.type || '',
      }));
      resolve(items);
    });
  });
}

export async function fetchInventory(steamId64) {
  console.log('[inventory] fetchInventory called for', steamId64);

  // 1️⃣ Try public API first (no bot needed)
  try {
    const items = await fetchViaPublicApi(steamId64);
    if (items !== null) {
      console.log('[inventory] ✅ Public API orqali', items.length, 'item qaytarildi');
      return items;
    }
    console.log('[inventory] ⚠️ Public API ishlamadi (private yoki rate-limit), bot sessionga o\'tilmoqda...');
  } catch (e) {
    console.warn('[inventory] Public API xatosi:', e.message);
  }

  // 2️⃣ Fallback: bot session
  if (!isBotReady()) {
    throw new Error('Inventar yuklab bo\'lmadi: Steam inventaringiz Private (yopiq) ko\'rinadi. Uni Public qiling yoki bot hali ulanmagan.');
  }

  return fetchViaBotSession(steamId64);
}

/**
 * Trade URL formatini tekshirish va undan partner/token qismini chiqarib olish
 * (faqat validatsiya uchun — inventarni olish uchun emas).
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
