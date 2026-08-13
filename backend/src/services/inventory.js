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
        // Steam already filtered to tradable-only (we passed tradableOnly=true above),
        // so don't re-filter here — some steamcommunity versions don't set an explicit
        // `.tradable` boolean per item, which previously caused everything to be dropped.
        tradable: item.tradable !== false,
        marketable: !!item.marketable,
        type: item.type || '',
      }));

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
