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
    community.getUserInventoryContents(steamId64, CS2_APP_ID, CS2_CONTEXT_ID, true, (err, inventory) => {
      if (err) {
        // steamcommunity library surfaces Steam's own error text here (e.g. "profile is private")
        return reject(new Error(err.message || 'Steam inventarni qaytarmadi'));
      }

      const items = (inventory || []).map((item) => ({
        assetId: item.assetid || item.id,
        classId: item.classid,
        instanceId: item.instanceid,
        marketHashName: item.market_hash_name || 'Noma\'lum item',
        iconUrl: item.icon_url ? `https://community.akamai.steamstatic.com/economy/image/${item.icon_url}` : '',
        tradable: !!item.tradable,
        marketable: !!item.marketable,
        type: item.type || '',
      })).filter((item) => item.tradable);

      resolve(items);
    });
  });
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
