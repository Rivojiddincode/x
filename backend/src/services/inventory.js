// StarsCS Skin Marketplace — Inventory Service
// Fetches a user's CS2 inventory directly from Steam's public inventory endpoint.

const CS2_APP_ID = 730;
const CS2_CONTEXT_ID = 2;

/**
 * Trade link'dan SteamID64'ni chiqarib olib bo'lmaydi to'g'ridan-to'g'ri (u faqat
 * partner ID va token beradi). Lekin bizning saytda user Steam OpenID orqali kirgan
 * bo'lgani uchun, uning steamId biz tomonda allaqachon bor (session/DB'da).
 * Shuning uchun bu funksiya to'g'ridan-to'g'ri steamId qabul qiladi;
 * trade link esa faqat "qayerga yuborish" manzili sifatida alohida saqlanadi.
 */
export async function fetchInventory(steamId64) {
  const url = `https://steamcommunity.com/inventory/${steamId64}/${CS2_APP_ID}/${CS2_CONTEXT_ID}?l=english&count=200`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (StarsCS Inventory Fetcher)' },
  });

  if (res.status === 403) {
    throw new Error('Inventar yopiq (private). Steam maxfiylik sozlamalarida inventarni "Public" qiling.');
  }
  if (!res.ok) {
    throw new Error(`Steam inventarni qaytarmadi (status ${res.status})`);
  }

  const data = await res.json();
  if (!data || !data.assets || !data.descriptions) {
    return [];
  }

  // descriptions classid+instanceid bo'yicha assets bilan bog'lanadi
  const descMap = {};
  for (const desc of data.descriptions) {
    descMap[`${desc.classid}_${desc.instanceid}`] = desc;
  }

  const items = data.assets.map((asset) => {
    const desc = descMap[`${asset.classid}_${asset.instanceid}`] || {};
    return {
      assetId: asset.assetid,
      classId: asset.classid,
      instanceId: asset.instanceid,
      marketHashName: desc.market_hash_name || 'Noma\'lum item',
      iconUrl: desc.icon_url ? `https://community.akamai.steamstatic.com/economy/image/${desc.icon_url}` : '',
      tradable: desc.tradable === 1,
      marketable: desc.marketable === 1,
      type: desc.type || '',
    };
  });

  // Faqat hozir trade qilsa bo'ladigan (cooldown'da bo'lmagan) itemlarni ko'rsatamiz
  return items.filter((item) => item.tradable);
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
