import React, { useState, useEffect } from 'react';
import { Link2, Tag, ShoppingCart, RefreshCw, CheckCircle2, AlertCircle, Lock, Zap, Search, Sword, Crosshair, Target, Wind, ShieldAlert, Heart, Hand, ChevronDown, Eye, X } from 'lucide-react';
import { API_BASE, authFetch } from '../api/client';
import { requestNotificationPermission, notifyBackground } from '../utils/notifications';

export function SkinMarketView({ user, onToast }) {
  const [subTab, setSubTab] = useState('shop'); // 'shop' | 'sell'
  const [tradeUrl, setTradeUrl] = useState(user?.tradeUrl || '');
  const [savingTradeUrl, setSavingTradeUrl] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [listPrice, setListPrice] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [floatData, setFloatData] = useState(null);
  const [loadingFloat, setLoadingFloat] = useState(false);
  const [floatInput, setFloatInput] = useState('');
  const [instantSelling, setInstantSelling] = useState(false);

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  useEffect(() => {
    fetchListings();
    requestNotificationPermission();
  }, []);

  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      const res = await fetch(`${API_BASE}/market/listings`);
      const data = await res.json();
      if (data.success) setListings(data.listings);
    } catch (e) {
      onToast?.('Do\'kon ro\'yxatini yuklab bo\'lmadi');
    } finally {
      setLoadingListings(false);
    }
  };

  const saveTradeUrl = async () => {
    if (!user) return onToast?.('Avval Steam orqali kiring');
    if (!tradeUrl.includes('partner=') || !tradeUrl.includes('token=')) {
      return onToast?.('Trade link formati noto\'g\'ri. Steam > Inventar > Trade Offers dan oling.');
    }
    setSavingTradeUrl(true);
    try {
      const data = await authFetch('/market/trade-url', {
        method: 'POST',
        body: JSON.stringify({ tradeUrl }),
      });
      if (data.success) {
        onToast?.('Trade link saqlandi!');
      } else {
        onToast?.(data.message || 'Xatolik yuz berdi');
      }
    } catch (e) {
      onToast?.('Serverga ulanib bo\'lmadi');
    } finally {
      setSavingTradeUrl(false);
    }
  };

  const loadInventory = async () => {
    if (!user) return onToast?.('Avval Steam orqali kiring');
    setLoadingInventory(true);
    setInventory([]);
    try {
      const data = await authFetch(`/market/inventory/${user.steamId}`);
      if (data.success) {
        setInventory(data.items);
        if (data.items.length === 0) onToast?.('Inventaringizda sotish mumkin bo\'lgan item topilmadi');
      } else {
        onToast?.(data.message || 'Inventarni yuklab bo\'lmadi');
      }
    } catch (e) {
      onToast?.('Inventarni yuklashda xatolik');
    } finally {
      setLoadingInventory(false);
    }
  };

  const selectItem = async (item) => {
    setSelectedItem(item);
    setListPrice('');
    setFloatInput('');
    setSuggestedPrice(null);
    setFloatData(null);
    setLoadingPrice(true);
    setLoadingFloat(true);

    fetch(`${API_BASE}/market/market-price?marketHashName=${encodeURIComponent(item.marketHashName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.price) {
          setSuggestedPrice(data.price); // UZS
          setListPrice(String(Math.round(data.price)));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrice(false));

    fetch(`${API_BASE}/market/float?inspectLink=${encodeURIComponent(item.inspectLink || '')}&assetId=${item.assetId || ''}&marketHashName=${encodeURIComponent(item.marketHashName || '')}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setFloatData(data.data);
          if (typeof data.data.floatValue === 'number') {
            setFloatInput(String(data.data.floatValue));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFloat(false));
  };

  const instantSell = async () => {
    if (!selectedItem) return;
    setInstantSelling(true);
    try {
      const data = await authFetch('/market/instant-sell', {
        method: 'POST',
        body: JSON.stringify({
          assetId: selectedItem.assetId,
          classId: selectedItem.classId,
          instanceId: selectedItem.instanceId,
          marketHashName: selectedItem.marketHashName,
          weaponType: selectedItem.type,
          inspectLink: selectedItem.inspectLink,
          iconUrl: selectedItem.iconUrl,
        }),
      });
      if (data.success) {
        onToast?.(data.message);
        setSelectedItem(null);
        setListPrice('');
        setFloatInput('');
        setInventory((prev) => prev.filter((i) => i.assetId !== selectedItem.assetId));
        if (data.transactionId) pollTransactionStatus(data.transactionId);
      } else {
        onToast?.(data.message || 'Tezkor sotishda xatolik');
      }
    } catch (e) {
      onToast?.('Serverga ulanib bo\'lmadi');
    } finally {
      setInstantSelling(false);
    }
  };

  const createListing = async () => {
    if (!selectedItem) return;
    const price = Number(listPrice);
    if (!price || price < 6500) {
      return onToast?.('Minimal narx 6 500 UZS');
    }
    setCreatingListing(true);
    try {
      const data = await authFetch('/market/listings', {
        method: 'POST',
        body: JSON.stringify({
          assetId: selectedItem.assetId,
          classId: selectedItem.classId,
          instanceId: selectedItem.instanceId,
          marketHashName: selectedItem.marketHashName,
          weaponType: selectedItem.type,
          inspectLink: selectedItem.inspectLink,
          iconUrl: selectedItem.iconUrl,
          price,
          floatValue: floatInput ? parseFloat(floatInput) : (floatData?.floatValue ?? null),
          paintSeed: floatData?.paintSeed ?? null,
        }),
      });
      if (data.success) {
        onToast?.('Item sotuvga qo\'yildi!');
        setSelectedItem(null);
        setListPrice('');
        setFloatInput('');
        setInventory((prev) => prev.filter((i) => i.assetId !== selectedItem.assetId));
        fetchListings();
      } else {
        onToast?.(data.message || 'Sotuvga qo\'yishda xatolik');
      }
    } catch (e) {
      onToast?.('Serverga ulanib bo\'lmadi');
    } finally {
      setCreatingListing(false);
    }
  };

  const pollTransactionStatus = (transactionId) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 30 * 5s = 150s (2.5 daqiqa max)

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`${API_BASE}/market/transactions/${transactionId}`);
        const data = await res.json();
        if (!data.success) return;

        if (data.status.startsWith('ESCROW')) {
          const until = data.escrowEndsAt ? new Date(data.escrowEndsAt).toLocaleDateString() : 'noma\'lum sana';
          onToast?.(`Bitim Steam escrow'ga tushdi — ${until}gacha kutish kerak (akkauntda Mobile Authenticator 7 kundan kam faol).`);
          return;
        }
        if (data.status === 'COMPLETED') {
          onToast?.('✅ Bitim yakunlandi!');
          notifyBackground('StarsCS', 'Bitimingiz yakunlandi! ✅');
          fetchListings();
          return;
        }
        if (data.status === 'FAILED' || data.status === 'NEEDS_ADMIN_REVIEW') {
          const msg = data.status === 'NEEDS_ADMIN_REVIEW'
            ? '⚠️ Xaridorga jo\'natib bo\'lmadi — pulingiz avtomatik qaytarildi.'
            : '❌ Bitim muvaffaqiyatsiz: ' + (data.failReason || 'noma\'lum xato');
          onToast?.(msg);
          notifyBackground('StarsCS', msg);
          return;
        }

        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 5000);
        } else {
          onToast?.('Bitim holatini tekshirish vaqti tugadi. Qaytadan yuklab tekshiring.');
        }
      } catch (e) {
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 5000);
        }
      }
    };
    poll();
  };

  const buyListing = async (listing) => {
    if (!user) return onToast?.('Avval Steam orqali kiring');
    if (!user.tradeUrl) return onToast?.('Avval "Sotish" bo\'limida trade link kiriting');
    setBuyingId(listing.id);
    try {
      const data = await authFetch(`/market/listings/${listing.id}/buy`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (data.success) {
        onToast?.(data.message);
        fetchListings();
        if (data.transactionId) pollTransactionStatus(data.transactionId);
      } else {
        onToast?.(data.message || 'Xarid qilib bo\'lmadi');
      }
    } catch (e) {
      onToast?.('Serverga ulanib bo\'lmadi');
    } finally {
      setBuyingId(null);
    }
  };

  const [cancellingId, setCancellingId] = useState(null);
  const cancelListing = async (listingId) => {
    if (!user) return onToast?.('Avval Steam orqali kiring');
    setCancellingId(listingId);
    try {
      const data = await authFetch(`/market/listings/${listingId}`, { method: 'DELETE' });
      if (data.success) {
        onToast?.(data.message || 'Skin sotuvdan olindi');
        fetchListings();
      } else {
        onToast?.(data.message || 'Sotuvdan olib bo\'lmadi');
      }
    } catch (e) {
      onToast?.('Serverga ulanib bo\'lmadi');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div>
      {/* Sub-navigation: Shop vs Sell */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          className={`btn ${subTab === 'shop' ? 'btn-wallet' : 'btn-steam'}`}
          onClick={() => setSubTab('shop')}
        >
          <ShoppingCart size={15} /> Skin Do'koni
        </button>
        <button
          className={`btn ${subTab === 'sell' ? 'btn-wallet' : 'btn-steam'}`}
          onClick={() => setSubTab('sell')}
        >
          <Tag size={15} /> Skin Sotish
        </button>
      </div>

      {subTab === 'shop' && (
        <ShopTab
          user={user}
          listings={listings}
          loading={loadingListings}
          onBuy={buyListing}
          buyingId={buyingId}
          onCancel={cancelListing}
          cancellingId={cancellingId}
          onRefresh={fetchListings}
        />
      )}

      {subTab === 'sell' && (
        <SellTab
          user={user}
          tradeUrl={tradeUrl}
          setTradeUrl={setTradeUrl}
          savingTradeUrl={savingTradeUrl}
          saveTradeUrl={saveTradeUrl}
          inventory={inventory}
          loadingInventory={loadingInventory}
          loadInventory={loadInventory}
          selectedItem={selectedItem}
          selectItem={selectItem}
          listPrice={listPrice}
          setListPrice={setListPrice}
          suggestedPrice={suggestedPrice}
          loadingPrice={loadingPrice}
          floatData={floatData}
          loadingFloat={loadingFloat}
          floatInput={floatInput}
          setFloatInput={setFloatInput}
          createListing={createListing}
          creatingListing={creatingListing}
          instantSell={instantSell}
          instantSelling={instantSelling}
        />
      )}
    </div>
  );
}

// marketHashName formati odatda "QurolNomi | Skin Nomi (Wear)" — "|" dan oldingi
// qism qurol nomi. Shunga qarab kategoriyaga ajratamiz.

// Har bir qurol uchun Steam CDN rasmlar
const WEAPON_IMAGES = {
  // Rifles
  'AK-47':    '/ak47.png',
  'M4A4':     'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777278/200fx125f',
  'M4A1-S':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777163/200fx125f',
  'SG 553':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777300/200fx125f',
  'AUG':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777162/200fx125f',
  'FAMAS':    'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777276/200fx125f',
  'Galil AR': 'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777279/200fx125f',
  // Snipers
  'AWP':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777164/200fx125f',
  'SSG 08':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777302/200fx125f',
  'SCAR-20':  'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777299/200fx125f',
  'G3SG1':    'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777275/200fx125f',
  // Pistols
  'Glock-18':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777277/200fx125f',
  'USP-S':         'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777165/200fx125f',
  'P250':          'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777293/200fx125f',
  'Desert Eagle':  'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777272/200fx125f',
  'Five-SeveN':    'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777274/200fx125f',
  'Tec-9':         'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777303/200fx125f',
  'CZ75-Auto':     'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777271/200fx125f',
  'P2000':         'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777292/200fx125f',
  'R8 Revolver':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777298/200fx125f',
  'Dual Berettas': 'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777273/200fx125f',
  // SMGs
  'MP9':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777288/200fx125f',
  'MAC-10':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777282/200fx125f',
  'MP7':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777287/200fx125f',
  'UMP-45':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777305/200fx125f',
  'P90':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777294/200fx125f',
  'PP-Bizon': 'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777295/200fx125f',
  'MP5-SD':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777286/200fx125f',
  // Heavy
  'Nova':      'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777290/200fx125f',
  'XM1014':   'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777307/200fx125f',
  'Sawed-Off': 'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777301/200fx125f',
  'MAG-7':    'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777283/200fx125f',
  'M249':     'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777281/200fx125f',
  'Negev':    'https://community.cloudflare.steamstatic.com/economy/image/class/730/310777289/200fx125f',
};

const WEAPON_CATEGORIES = {
  knife: {
    label: 'Pichoq', icon: Sword,
    weapons: ['Karambit', 'Bayonet', 'Butterfly Knife', 'Bowie Knife', 'Falchion Knife', 'Flip Knife', 'Gut Knife', 'Huntsman Knife', 'M9 Bayonet', 'Navaja Knife', 'Nomad Knife', 'Paracord Knife', 'Shadow Daggers', 'Skeleton Knife', 'Stiletto Knife', 'Survival Knife', 'Talon Knife', 'Ursus Knife', 'Classic Knife'],
    match: (w) => w.startsWith('★') && !/gloves|wraps/i.test(w),
  },
  gloves: {
    label: 'Qo\'lqop', icon: Hand,
    weapons: ['Bloodhound Gloves', 'Broken Fang Gloves', 'Driver Gloves', 'Hand Wraps', 'Hydra Gloves', 'Moto Gloves', 'Specialist Gloves', 'Sport Gloves'],
    match: (w) => /gloves|wraps/i.test(w),
  },
  sniper: {
    label: 'Snayper', icon: Crosshair,
    weapons: ['AWP', 'G3SG1', 'SCAR-20', 'SSG 08'],
    match: (w) => ['awp', 'ssg 08', 'scar-20', 'g3sg1'].includes(w.toLowerCase()),
  },
  rifle: {
    label: 'Avtomat', icon: Target,
    weapons: ['AK-47', 'M4A4', 'M4A1-S', 'SG 553', 'AUG', 'FAMAS', 'Galil AR'],
    match: (w) => ['ak-47', 'm4a4', 'm4a1-s', 'sg 553', 'aug', 'famas', 'galil ar'].includes(w.toLowerCase()),
  },
  pistol: {
    label: 'Pistolet', icon: Zap,
    weapons: ['Glock-18', 'USP-S', 'P250', 'Desert Eagle', 'Five-SeveN', 'Tec-9', 'CZ75-Auto', 'P2000', 'R8 Revolver', 'Dual Berettas'],
    match: (w) => ['glock-18', 'usp-s', 'p250', 'desert eagle', 'five-seven', 'tec-9', 'cz75-auto', 'p2000', 'r8 revolver', 'dual berettas'].includes(w.toLowerCase()),
  },
  smg: {
    label: 'SMG', icon: Wind,
    weapons: ['MP9', 'MAC-10', 'MP7', 'UMP-45', 'P90', 'PP-Bizon', 'MP5-SD'],
    match: (w) => ['mp9', 'mac-10', 'mp7', 'ump-45', 'p90', 'pp-bizon', 'mp5-sd'].includes(w.toLowerCase()),
  },
  heavy: {
    label: 'Og\'ir qurol', icon: ShieldAlert,
    weapons: ['Nova', 'XM1014', 'Sawed-Off', 'MAG-7', 'M249', 'Negev'],
    match: (w) => ['nova', 'xm1014', 'sawed-off', 'mag-7', 'm249', 'negev'].includes(w.toLowerCase()),
  },
};

function getWeaponCategory(marketHashName = '') {
  const weaponPart = marketHashName.split('|')[0].trim();
  for (const [key, cat] of Object.entries(WEAPON_CATEGORIES)) {
    if (cat.match(weaponPart)) return key;
  }
  return 'other';
}

// "(Factory New)" -> "FN" kabi qisqartma chiqarib olish (kartaning yuqori-chap burchagida ko'rsatish uchun)
function getWearAbbrev(name = '') {
  if (/factory new/i.test(name)) return { code: 'FN', color: '#4ade80' };
  if (/minimal wear/i.test(name)) return { code: 'MW', color: '#a3e635' };
  if (/field-tested/i.test(name)) return { code: 'FT', color: '#facc15' };
  if (/well-worn/i.test(name)) return { code: 'WW', color: '#fb923c' };
  if (/battle-scarred/i.test(name)) return { code: 'BS', color: '#f87171' };
  return null;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Yangi qo\'shilganlar' },
  { value: 'price_asc', label: 'Narx: Arzondan qimmatga' },
  { value: 'price_desc', label: 'Narx: Qimmatdan arzonga' },
  { value: 'name_asc', label: 'Nomi: A → Z' },
  { value: 'name_desc', label: 'Nomi: Z → A' },
];

// marketHashName'dagi kalit so'zlarga qarab taxminiy "rarity" rangini aniqlaydi —
// backend'da alohida rarity maydoni yo'q, shuning uchun nom ichidan chiqarib olamiz.
function getRarityAccent(name = '') {
  const n = name.toLowerCase();
  if (n.startsWith('★') || n.includes('knife') || n.includes('gloves') || n.includes('bayonet') || n.includes('karambit')) {
    return { color: '#e4ae39', label: 'Pichoq/Qo\'lqop' }; // Gold — knife/glove tier
  }
  if (n.includes('stattrak')) {
    return { color: '#cf6a32', label: 'StatTrak™' }; // Orange
  }
  if (n.includes('souvenir')) {
    return { color: '#ffd700', label: 'Souvenir' };
  }
  return { color: '#4b69ff', label: 'Restricted+' }; // Default blue-ish (Steam classified/restricted family)
}

// Real Steam "type" matnidan (masalan "Covert Rifle", "Extraordinary Knife")
// rarity darajasini chiqarib olamiz — Steam'ning o'z terminologiyasi shu.
const RARITY_TIERS = [
  { key: 'consumer', label: 'Standart', color: '#b0c3d9', match: (t) => /consumer/i.test(t) },
  { key: 'industrial', label: 'Sanoat', color: '#5e98d9', match: (t) => /industrial/i.test(t) },
  { key: 'milspec', label: 'Mil-Spec', color: '#4b69ff', match: (t) => /mil-spec/i.test(t) },
  { key: 'restricted', label: 'Cheklangan', color: '#8847ff', match: (t) => /restricted/i.test(t) },
  { key: 'classified', label: 'Tasniflangan', color: '#d32ce6', match: (t) => /classified/i.test(t) },
  { key: 'covert', label: 'Maxfiy', color: '#eb4b4b', match: (t) => /covert/i.test(t) },
  { key: 'contraband', label: 'Kontrabanda', color: '#e4ae39', match: (t) => /contraband/i.test(t) },
  { key: 'extraordinary', label: 'Pichoq/Qo\'lqop', color: '#e4ae39', match: (t) => /extraordinary/i.test(t) },
];

function getRarityTier(weaponType = '') {
  return RARITY_TIERS.find((r) => r.match(weaponType)) || null;
}

function ShopTab({ user, listings, loading, onBuy, buyingId, onCancel, cancellingId, onRefresh }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [category, setCategory] = useState('all');
  const [weaponFilter, setWeaponFilter] = useState(null); // masalan "AWP" — kategoriya ichida aniq qurol
  const [expandedCategory, setExpandedCategory] = useState(null); // qaysi tab dropdown ochiq
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [rarityFilter, setRarityFilter] = useState([]); // tanlangan rarity key'lar ro'yxati
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('starscs_favorites') || '[]'); } catch { return []; }
  });
  const [detailListing, setDetailListing] = useState(null); // "Batafsil ko'rish" modalida ochilgan item

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem('starscs_favorites', JSON.stringify(next));
      return next;
    });
  };

  const toggleRarity = (key) => {
    setRarityFilter((prev) => prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]);
  };

  const categoryCounts = React.useMemo(() => {
    const counts = { all: listings.length };
    for (const l of listings) {
      const cat = getWeaponCategory(l.marketHashName);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [listings]);

  // Bir xil nomdagi (bir nechta sotuvchidan) itemlar sonini hisoblaymiz — "xN" belgisi uchun
  const nameCounts = React.useMemo(() => {
    const counts = {};
    for (const l of listings) counts[l.marketHashName] = (counts[l.marketHashName] || 0) + 1;
    return counts;
  }, [listings]);

  const visibleListings = React.useMemo(() => {
    let result = listings;
    if (category !== 'all') {
      result = result.filter((l) => getWeaponCategory(l.marketHashName) === category);
    }
    if (weaponFilter) {
      result = result.filter((l) => l.marketHashName.split('|')[0].trim().toLowerCase() === weaponFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => l.marketHashName.toLowerCase().includes(q));
    }
    const numFrom = Number(priceFrom);
    if (priceFrom && Number.isFinite(numFrom)) result = result.filter((l) => l.price >= numFrom);
    const numTo = Number(priceTo);
    if (priceTo && Number.isFinite(numTo)) result = result.filter((l) => l.price <= numTo);
    if (rarityFilter.length > 0) {
      result = result.filter((l) => {
        const tier = getRarityTier(l.weaponType);
        return tier && rarityFilter.includes(tier.key);
      });
    }
    if (favoritesOnly) {
      result = result.filter((l) => favorites.includes(l.id));
    }
    const sorted = [...result];
    switch (sortBy) {
      case 'price_asc': sorted.sort((a, b) => a.price - b.price); break;
      case 'price_desc': sorted.sort((a, b) => b.price - a.price); break;
      case 'name_asc': sorted.sort((a, b) => a.marketHashName.localeCompare(b.marketHashName)); break;
      case 'name_desc': sorted.sort((a, b) => b.marketHashName.localeCompare(a.marketHashName)); break;
      default: sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return sorted;
  }, [listings, search, sortBy, category, weaponFilter, priceFrom, priceTo, rarityFilter, favoritesOnly, favorites]);

  return (
    <div>
      <div className="category-tabs">
        <button
          className={`category-tab ${category === 'all' ? 'active' : ''}`}
          onClick={() => { setCategory('all'); setWeaponFilter(null); setExpandedCategory(null); }}
        >
          Barchasi <span className="category-count">{categoryCounts.all || 0}</span>
        </button>
        {Object.entries(WEAPON_CATEGORIES).map(([key, cat]) => {
          const Icon = cat.icon;
          const count = categoryCounts[key] || 0;
          if (count === 0) return null;
          const isExpanded = expandedCategory === key;
          return (
            <div key={key} className="category-tab-wrap">
              <button
                className={`category-tab ${category === key ? 'active' : ''}`}
                onClick={() => { setCategory(key); setWeaponFilter(null); }}
              >
                <Icon size={13} /> {cat.label} <span className="category-count">{count}</span>
                <ChevronDown
                  size={13}
                  className={`category-chevron ${isExpanded ? 'open' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setExpandedCategory(isExpanded ? null : key); }}
                />
              </button>
              {isExpanded && (
                <div className="category-dropdown">
                  <button
                    className={`category-dropdown-item ${!weaponFilter ? 'active' : ''}`}
                    onClick={() => { setCategory(key); setWeaponFilter(null); setExpandedCategory(null); }}
                  >
                    Barchasini ko'rsatish
                  </button>
                  {cat.weapons.map((w) => (
                    <button
                      key={w}
                      className={`category-dropdown-item ${weaponFilter === w ? 'active' : ''}`}
                      onClick={() => { setCategory(key); setWeaponFilter(w); setExpandedCategory(null); }}
                    >
                      {WEAPON_IMAGES[w] ? (
                        <span className={`category-dropdown-img-wrap ${w === 'AK-47' ? 'ak47-glow' : ''}`}>
                          <img
                            src={WEAPON_IMAGES[w]}
                            alt={w}
                            className="category-dropdown-weapon-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </span>
                      ) : (
                        <Icon size={13} className="category-dropdown-icon" />
                      )}
                      {w}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shop-layout">
        {/* Chap panel — narx va rarity filtri */}
        <aside className="shop-sidebar">
          <div className="shop-filter-block">
            <h4 className="shop-filter-title">Narx (UZS)</h4>
            <div className="shop-price-range">
              <input type="number" placeholder="Dan" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
              <span>—</span>
              <input type="number" placeholder="Gacha" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} />
            </div>
          </div>

          <div className="shop-filter-block">
            <h4 className="shop-filter-title">Rarity</h4>
            <div className="shop-rarity-list">
              {RARITY_TIERS.map((tier) => (
                <label key={tier.key} className="shop-rarity-item">
                  <input
                    type="checkbox"
                    checked={rarityFilter.includes(tier.key)}
                    onChange={() => toggleRarity(tier.key)}
                  />
                  <span className="shop-rarity-dot" style={{ background: tier.color }} />
                  {tier.label}
                </label>
              ))}
            </div>
          </div>

          <div className="shop-filter-block">
            <label className="shop-rarity-item" style={{ fontWeight: 700 }}>
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
              <Heart size={13} fill={favoritesOnly ? 'var(--red)' : 'none'} color="var(--red)" /> Sevimlilar
            </label>
          </div>
        </aside>

        {/* O'ng qism — toolbar + grid */}
        <div className="shop-main">
          <div className="shop-toolbar">
            <div className="shop-search">
              <Search size={15} className="shop-search-icon" />
              <input
                placeholder="Skin nomi bo'yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="shop-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button className="btn btn-steam" onClick={onRefresh}>
              <RefreshCw size={14} /> Yangilash
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '10px 0 16px' }}>
            Barcha narxlar sobit — tasodifiy natijaga asoslangan xarid mavjud emas. {visibleListings.length} ta natija.
          </p>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
          ) : visibleListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                {listings.length === 0
                  ? "Hozircha sotuvda skin yo'q. Birinchi bo'lib siz sotuvga qo'ying!"
                  : 'Filtrlaringizga mos skin topilmadi.'}
              </p>
            </div>
          ) : (
            <div className="grid">
              {visibleListings.map((listing) => {
                const tier = getRarityTier(listing.weaponType);
                const accentColor = tier?.color || getRarityAccent(listing.marketHashName).color;
                const wear = getWearAbbrev(listing.marketHashName);
                const isFav = favorites.includes(listing.id);
                const qty = nameCounts[listing.marketHashName];
                const isHighValue = listing.price >= 400000; // ~$30 — qimmat item, porlaydigan fon

                return (
                  <div
                    key={listing.id}
                    className={`skin-card ${isHighValue ? 'skin-card-premium' : ''}`}
                    style={{ '--rarity-color': accentColor }}
                  >
                    {/* Rasm — to'liq card kengligida, ustida wear + yurak */}
                    <div className="skin-card-img-area" onClick={() => setDetailListing(listing)}>
                      {listing.iconUrl ? (
                        <img
                          className="skin-card-img"
                          src={listing.iconUrl}
                          alt={listing.marketHashName}
                        />
                      ) : (
                        <div className="skin-card-img-placeholder">
                          <Tag size={40} color="var(--text-muted)" />
                        </div>
                      )}
                      {/* Wear badge + Yurak — rasm ustida */}
                      <div className="skin-card-badges">
                        {wear ? (
                          <span className="skin-card-wear" style={{ color: wear.color, borderColor: wear.color }}>{wear.code}</span>
                        ) : <span />}
                        <button
                          className="skin-card-fav"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(listing.id); }}
                        >
                          <Heart size={15} fill={isFav ? 'var(--red)' : 'none'} color={isFav ? 'var(--red)' : 'currentColor'} />
                        </button>
                      </div>
                    </div>

                    {/* Pastki qism — nom, sotuvchi, narx, buy btn */}
                    <div className="skin-card-body">
                      <h3 className="skin-card-name" title={listing.marketHashName}>{listing.marketHashName}</h3>
                      <p className="skin-card-seller">Sotuvchi: {listing.seller?.displayName || 'Noma\'lum'}</p>

                      <div className="skin-card-footer">
                        <span className="skin-card-price-wrap">
                          <span className="skin-card-price">{Number(listing.price).toLocaleString()} UZS</span>
                          {qty > 1 && <span className="skin-card-qty">x{qty}</span>}
                        </span>

                        {/* Hover da narxdan pastida chiqadi */}
                        {user && (listing.sellerId === user.id || listing.seller?.steamId === user.steamId) ? (
                          <button
                            className="skin-card-buy-btn skin-card-cancel-btn"
                            disabled={cancellingId === listing.id}
                            onClick={() => onCancel(listing.id)}
                          >
                            {cancellingId === listing.id ? '...' : 'Sotuvdan olish'}
                          </button>
                        ) : (
                          <button
                            className="skin-card-buy-btn"
                            disabled={buyingId === listing.id}
                            onClick={() => onBuy(listing)}
                          >
                            <ShoppingCart size={14} />
                            {buyingId === listing.id ? '...' : 'Sotib olish'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detailListing && (
        <SkinDetailModal listing={detailListing} onClose={() => setDetailListing(null)} onBuy={onBuy} buyingId={buyingId} />
      )}
    </div>
  );
}

// Real CS2 wear diapazonlari — float bar segmentlarini shu nisbatlarda chizamiz
const WEAR_RANGES = [
  { code: 'FN', from: 0, to: 0.07, color: '#4ade80', label: 'Factory New' },
  { code: 'MW', from: 0.07, to: 0.15, color: '#a3e635', label: 'Minimal Wear' },
  { code: 'FT', from: 0.15, to: 0.38, color: '#facc15', label: 'Field-Tested' },
  { code: 'WW', from: 0.38, to: 0.45, color: '#fb923c', label: 'Well-Worn' },
  { code: 'BS', from: 0.45, to: 1.00, color: '#f87171', label: 'Battle-Scarred' },
];

function FloatBar({ value }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="float-bar-wrap">
      <div className="float-bar-track">
        {WEAR_RANGES.map((r) => (
          <div key={r.code} style={{ width: `${(r.to - r.from) * 100}%`, background: r.color }} />
        ))}
        <div className="float-bar-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="float-bar-labels">
        {WEAR_RANGES.map((r) => <span key={r.code}>{r.code}</span>)}
      </div>
    </div>
  );
}

function SkinDetailModal({ listing, onClose, onBuy, buyingId }) {
  const [floatData, setFloatData] = useState(null);
  const [loadingFloat, setLoadingFloat] = useState(false);

  React.useEffect(() => {
    setLoadingFloat(true);
    fetch(`${API_BASE}/market/float?inspectLink=${encodeURIComponent(listing.inspectLink || '')}&assetId=${listing.assetId || ''}&marketHashName=${encodeURIComponent(listing.marketHashName || '')}`)
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data) setFloatData(d.data); })
      .catch(() => {})
      .finally(() => setLoadingFloat(false));
  }, [listing.id]);

  const tier = getRarityTier(listing.weaponType);
  const accentColor = tier?.color || getRarityAccent(listing.marketHashName).color;

  return (
    <div className="skin-modal-overlay" onClick={onClose}>
      <div className="skin-modal" onClick={(e) => e.stopPropagation()} style={{ '--rarity-color': accentColor }}>
        <button className="skin-modal-close" onClick={onClose}><X size={18} /></button>

        <div className="skin-modal-image">
          {listing.iconUrl ? <img src={listing.iconUrl} alt={listing.marketHashName} /> : <Tag size={48} color="var(--text-muted)" />}
        </div>

        <h2 className="skin-modal-title">{listing.marketHashName}</h2>
        <p className="skin-modal-seller">Sotuvchi: {listing.seller?.displayName || 'Noma\'lum'}</p>

        <div className="skin-modal-section">
          <h4 className="shop-filter-title">Float qiymati</h4>
          {loadingFloat ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Yuklanmoqda...</p>
          ) : floatData ? (
            <>
              <FloatBar value={typeof floatData.floatValue === 'number' ? floatData.floatValue : ((floatData.min ?? 0) + (floatData.max ?? 1)) / 2} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12.5px' }}>
                {typeof floatData.floatValue === 'number' ? (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Float: <b style={{ color: '#fff', fontFamily: 'monospace' }}>{floatData.floatValue.toFixed(6)}</b>
                    </span>
                    {floatData.paintSeed != null && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        Paint Seed: <b style={{ color: '#fff' }}>{floatData.paintSeed}</b>
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Kiyim toifasi: <b style={{ color: '#fff' }}>{floatData.wearName} {floatData.wearCode ? `(${floatData.wearCode})` : ''}</b> ({floatData.min} - {floatData.max})
                  </span>
                )}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Bu item uchun float ma'lumoti mavjud emas (Keys/Stiker/Konteynerlar).
            </p>
          )}
        </div>

        {listing.inspectLink && (
          <a href={listing.inspectLink} className="btn btn-steam skin-modal-inspect">
            <Eye size={15} /> O'yinda ko'rish (Inspect in Game)
          </a>
        )}

        <div className="skin-modal-footer">
          <span className="skin-card-price" style={{ fontSize: '24px' }}>{Number(listing.price).toLocaleString()} UZS</span>
          <button
            className="btn btn-wallet"
            disabled={buyingId === listing.id}
            onClick={() => { onBuy(listing); onClose(); }}
          >
            {buyingId === listing.id ? '...' : 'Sotib olish'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SellTab({
  user, tradeUrl, setTradeUrl, savingTradeUrl, saveTradeUrl,
  inventory, loadingInventory, loadInventory,
  selectedItem, selectItem, listPrice, setListPrice,
  suggestedPrice, loadingPrice,
  floatData, loadingFloat,
  floatInput, setFloatInput,
  createListing, creatingListing,
  instantSell, instantSelling,
}) {
  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={32} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Skin sotish uchun avval Steam orqali tizimga kiring.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Trade URL setup */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 className="card-title" style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link2 size={16} /> Trade Link
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 12px' }}>
          Steam &gt; Inventar &gt; Trade Offers &gt; Trade URL dan nusxa oling.
          {user.tradeUrl && <span style={{ color: 'var(--green)', marginLeft: '6px' }}><CheckCircle2 size={12} style={{ verticalAlign: 'middle' }} /> Saqlangan</span>}
        </p>
        <p style={{ fontSize: '12px', color: '#f5a623', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={13} /> Faqat hozir saytga kirgan Steam akkauntingizning o'z trade link'ini kiriting — boshqa akkaunt link'i qabul qilinmaydi.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={tradeUrl}
            onChange={(e) => setTradeUrl(e.target.value)}
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
            style={{ flex: 1, minWidth: '260px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff', fontSize: '13px' }}
          />
          <button className="btn btn-wallet" onClick={saveTradeUrl} disabled={savingTradeUrl}>
            {savingTradeUrl ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* Inventory */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="card-title" style={{ fontSize: '15px' }}>Inventaringiz</h3>
          <button className="btn btn-steam" onClick={loadInventory} disabled={loadingInventory}>
            <RefreshCw size={14} /> {loadingInventory ? 'Yuklanmoqda...' : 'Inventarni yuklash'}
          </button>
        </div>

        {inventory.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            "Inventarni yuklash" tugmasini bosing. Inventaringiz Steam sozlamalarida "Public" bo'lishi kerak.
          </p>
        ) : (
          <div className="grid">
            {inventory.map((item) => (
              <div
                key={item.assetId}
                className="card"
                style={{
                  cursor: item.tradable ? 'pointer' : 'not-allowed',
                  opacity: item.tradable ? 1 : 0.45,
                  filter: item.tradable ? 'none' : 'grayscale(0.6)',
                  position: 'relative',
                  borderColor: selectedItem?.assetId === item.assetId ? 'var(--money)' : 'var(--card-border)',
                  padding: '12px',
                }}
                onClick={() => item.tradable && selectItem(item)}
              >
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginBottom: '8px' }}>
                  {item.iconUrl ? <img src={item.iconUrl} alt={item.marketHashName} style={{ maxHeight: '90%', maxWidth: '90%' }} /> : <Tag size={24} color="var(--text-muted)" />}
                </div>
                <p style={{ fontSize: '11px', textAlign: 'center' }}>{item.marketHashName}</p>
                {!item.tradable && (
                  <div style={{
                    marginTop: '6px', fontSize: '10px', color: '#f87171', textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}>
                    <Lock size={11} /> {item.cooldownText || 'Trade cooldown\'da'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listing form */}
      {selectedItem && (
        <div className="card">
          <h3 className="card-title" style={{ fontSize: '15px' }}>Sotuvga qo'yish: {selectedItem.marketHashName}</h3>

          {/* Float Card Section */}
          <div style={{ margin: '14px 0 10px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8' }}>
                FLOAT QIYMATI
              </span>
              {loadingFloat ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aniqlanmoqda...</span>
              ) : floatInput && !isNaN(parseFloat(floatInput)) ? (
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#38bdf8' }}>
                  Float: {parseFloat(floatInput).toFixed(6)}
                </span>
              ) : null}
            </div>

            {/* Live Float Bar matching the user's design */}
            <FloatBar
              value={
                floatInput && !isNaN(parseFloat(floatInput))
                  ? parseFloat(floatInput)
                  : (typeof floatData?.floatValue === 'number'
                      ? floatData.floatValue
                      : (floatData?.min != null ? (floatData.min + floatData.max) / 2 : null))
              }
            />

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                step="0.000001"
                min="0"
                max="1"
                placeholder="Float kiriting (masalan: 0.184521)"
                value={floatInput}
                onChange={(e) => setFloatInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: '600',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              {floatData?.floatValue != null
                ? "Avto-aniqlangan float qiymati to'ldirildi. Xohlasangiz o'zgartirishingiz mumkin."
                : "Float avtomatik aniqlansa joylanadi, aks holda CS2 yoki Steam'dan ko'rib o'zingiz kiriting."}
            </span>
          </div>

          <div style={{ margin: '10px 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {loadingPrice ? (
              'Steam Market\'dan hozirgi narx tekshirilmoqda...'
            ) : suggestedPrice ? (
              <span>
                Steam Market'dagi hozirgi narx: <b style={{ color: 'var(--money)' }}>{Number(suggestedPrice).toLocaleString()} UZS</b>
                {' '}— narx maydoni shunga qarab avtomatik to'ldirildi, xohlasangiz o'zgartiring.
              </span>
            ) : (
              'Bu item uchun Steam Market narxi topilmadi — narxni qo\'lda kiriting.'
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <input
              type="number"
              min="6500"
              step="100"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="Narx (UZS), min 6 500"
              style={{ flex: 1, minWidth: '160px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff', fontSize: '13px' }}
            />
            <button className="btn btn-wallet" onClick={createListing} disabled={creatingListing}>
              {creatingListing ? 'Joylanmoqda...' : 'Sotuvga qo\'yish'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Minimal sotuv narxi: 6 500 UZS. Undan past narx serverda rad etiladi.
          </p>

          {suggestedPrice && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <button
                className="btn btn-steam"
                style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(74,222,128,0.4)', color: 'var(--green)' }}
                onClick={instantSell}
                disabled={instantSelling}
              >
                <Zap size={15} /> {instantSelling
                  ? 'Yuborilmoqda...'
                  : `Tezkor Sotish — darhol ${Math.round(suggestedPrice * 0.5).toLocaleString()} UZS`}
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                Xaridorni kutmasdan, bozor narxining 50%i darhol balansingizga tushadi.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
