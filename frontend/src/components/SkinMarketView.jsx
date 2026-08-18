import React, { useState, useEffect } from 'react';
import { Link2, Tag, ShoppingCart, RefreshCw, CheckCircle2, AlertCircle, Lock, Zap, Search, Sword, Crosshair, Target, Wind, ShieldAlert } from 'lucide-react';
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
    setSuggestedPrice(null);
    setFloatData(null);
    setLoadingPrice(true);
    setLoadingFloat(true);

    fetch(`${API_BASE}/market/market-price?marketHashName=${encodeURIComponent(item.marketHashName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.price) {
          setSuggestedPrice(data.price);
          setListPrice(data.price.toFixed(2));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrice(false));

    if (item.inspectLink) {
      fetch(`${API_BASE}/market/float?inspectLink=${encodeURIComponent(item.inspectLink)}&assetId=${item.assetId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) setFloatData(data.data);
        })
        .catch(() => {})
        .finally(() => setLoadingFloat(false));
    } else {
      setLoadingFloat(false);
    }
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
          iconUrl: selectedItem.iconUrl,
        }),
      });
      if (data.success) {
        onToast?.(data.message);
        setSelectedItem(null);
        setListPrice('');
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
    if (!price || price < 0.5) {
      return onToast?.('Minimal narx $0.5');
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
          iconUrl: selectedItem.iconUrl,
          price,
        }),
      });
      if (data.success) {
        onToast?.('Item sotuvga qo\'yildi!');
        setSelectedItem(null);
        setListPrice('');
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
    const poll = async () => {
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
        // Hali jarayonda — 5 soniyadan keyin qayta tekshiramiz
        setTimeout(poll, 5000);
      } catch (e) {
        // jim o'tkazamiz — keyingi pollda qayta urinamiz
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
        <ShopTab listings={listings} loading={loadingListings} onBuy={buyListing} buyingId={buyingId} onRefresh={fetchListings} />
      )}

      {subTab === 'sell' && (
        <SellTab
          user={user}
          tradeUrl={tradeUrl}
          setTradeUrl={setTradeUrl}
          savingTradeUrl={savingTradeUrl}
          onSaveTradeUrl={saveTradeUrl}
          inventory={inventory}
          loadingInventory={loadingInventory}
          onLoadInventory={loadInventory}
          selectedItem={selectedItem}
          onSelectItem={selectItem}
          listPrice={listPrice}
          setListPrice={setListPrice}
          suggestedPrice={suggestedPrice}
          loadingPrice={loadingPrice}
          floatData={floatData}
          loadingFloat={loadingFloat}
          onCreateListing={createListing}
          creatingListing={creatingListing}
          onInstantSell={instantSell}
          instantSelling={instantSelling}
        />
      )}
    </div>
  );
}

// marketHashName formati odatda "QurolNomi | Skin Nomi (Wear)" — "|" dan oldingi
// qism qurol nomi. Shunga qarab kategoriyaga ajratamiz.
const WEAPON_CATEGORIES = {
  knife: {
    label: 'Pichoq / Qo\'lqop', icon: Sword,
    match: (w) => w.startsWith('★') || /knife|karambit|bayonet|gloves|wraps/i.test(w),
  },
  sniper: {
    label: 'Snayper', icon: Crosshair,
    match: (w) => ['awp', 'ssg 08', 'scar-20', 'g3sg1'].includes(w.toLowerCase()),
  },
  rifle: {
    label: 'Avtomat', icon: Target,
    match: (w) => ['ak-47', 'm4a4', 'm4a1-s', 'sg 553', 'aug', 'famas', 'galil ar'].includes(w.toLowerCase()),
  },
  pistol: {
    label: 'Pistolet', icon: Zap,
    match: (w) => ['glock-18', 'usp-s', 'p250', 'desert eagle', 'five-seven', 'tec-9', 'cz75-auto', 'p2000', 'r8 revolver', 'dual berettas'].includes(w.toLowerCase()),
  },
  smg: {
    label: 'SMG', icon: Wind,
    match: (w) => ['mp9', 'mac-10', 'mp7', 'ump-45', 'p90', 'pp-bizon', 'mp5-sd'].includes(w.toLowerCase()),
  },
  heavy: {
    label: 'Og\'ir qurol', icon: ShieldAlert,
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
  return { color: '#4b69ff', label: 'Restricted+' }; // Default blue-ish
}

function ShopTab({ listings, loading, onBuy, buyingId, onRefresh }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [category, setCategory] = useState('all');

  const categoryCounts = React.useMemo(() => {
    const counts = { all: listings.length };
    for (const l of listings) {
      const cat = getWeaponCategory(l.marketHashName);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [listings]);

  const visibleListings = React.useMemo(() => {
    let result = listings;
    if (category !== 'all') {
      result = result.filter((l) => getWeaponCategory(l.marketHashName) === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => l.marketHashName.toLowerCase().includes(q));
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
  }, [listings, search, sortBy, category]);

  return (
    <div>
      {/* Kategoriya tablari */}
      <div className="category-tabs">
        <button className={`category-tab ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>
          Barchasi <span className="category-count">{categoryCounts.all || 0}</span>
        </button>
        {Object.entries(WEAPON_CATEGORIES).map(([key, cat]) => {
          const Icon = cat.icon;
          const count = categoryCounts[key] || 0;
          if (count === 0) return null;
          return (
            <button key={key} className={`category-tab ${category === key ? 'active' : ''}`} onClick={() => setCategory(key)}>
              <Icon size={13} /> {cat.label} <span className="category-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Qidiruv + Saralash */}
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
              : 'Qidiruvingizga mos skin topilmadi.'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {visibleListings.map((listing) => {
            const rarity = getRarityAccent(listing.marketHashName);
            return (
              <div key={listing.id} className="skin-card" style={{ '--rarity-color': rarity.color }}>
                <div className="skin-card-bar" />
                <div className="skin-card-thumb">
                  {listing.iconUrl ? (
                    <img src={listing.iconUrl} alt={listing.marketHashName} />
                  ) : (
                    <Tag size={32} color="var(--text-muted)" />
                  )}
                </div>
                <h3 className="skin-card-name" title={listing.marketHashName}>{listing.marketHashName}</h3>
                <p className="skin-card-seller">
                  Sotuvchi: {listing.seller?.displayName || 'Noma\'lum'}
                </p>
                <div className="skin-card-footer">
                  <span className="skin-card-price">${listing.price.toFixed(2)}</span>
                  <button
                    className="btn btn-wallet"
                    disabled={buyingId === listing.id}
                    onClick={() => onBuy(listing)}
                  >
                    {buyingId === listing.id ? 'Yuborilmoqda...' : 'Sotib olish'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SellTab({
  user, tradeUrl, setTradeUrl, savingTradeUrl, onSaveTradeUrl,
  inventory, loadingInventory, onLoadInventory,
  selectedItem, onSelectItem, listPrice, setListPrice,
  suggestedPrice, loadingPrice,
  floatData, loadingFloat,
  onCreateListing, creatingListing,
  onInstantSell, instantSelling,
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
          <button className="btn btn-wallet" onClick={onSaveTradeUrl} disabled={savingTradeUrl}>
            {savingTradeUrl ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* Inventory */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="card-title" style={{ fontSize: '15px' }}>Inventaringiz</h3>
          <button className="btn btn-steam" onClick={onLoadInventory} disabled={loadingInventory}>
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
                onClick={() => item.tradable && onSelectItem(item)}
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

          <div style={{ margin: '8px 0', fontSize: '12px' }}>
            {loadingFloat ? (
              <span style={{ color: 'var(--text-muted)' }}>Float qiymati tekshirilmoqda...</span>
            ) : floatData ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)',
                  padding: '3px 10px', borderRadius: '6px', color: 'var(--span)', fontFamily: 'monospace', fontWeight: '700',
                }}>
                  Float: {floatData.floatValue?.toFixed(6)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Paint Seed: <b style={{ color: '#fff' }}>{floatData.paintSeed}</b>
                </span>
                {floatData.wearName && <span style={{ color: 'var(--text-muted)' }}>({floatData.wearName})</span>}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Float ma'lumoti topilmadi (statTrak/knife bo'lmagan itemlar uchun odatiy holat).</span>
            )}
          </div>

          <div style={{ margin: '10px 0 4px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {loadingPrice ? (
              'Steam Market\'dan hozirgi narx tekshirilmoqda...'
            ) : suggestedPrice ? (
              <span>
                Steam Market'dagi hozirgi narx: <b style={{ color: 'var(--money)' }}>${suggestedPrice.toFixed(2)}</b>
                {' '}— narx maydoni shunga qarab avtomatik to'ldirildi, xohlasangiz o'zgartiring.
              </span>
            ) : (
              'Bu item uchun Steam Market narxi topilmadi — narxni qo\'lda kiriting.'
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
            <input
              type="number"
              min="0.5"
              step="0.01"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="Narx ($), min 0.5"
              style={{ flex: 1, minWidth: '160px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff', fontSize: '13px' }}
            />
            <button className="btn btn-wallet" onClick={onCreateListing} disabled={creatingListing}>
              {creatingListing ? 'Joylanmoqda...' : 'Sotuvga qo\'yish'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Minimal sotuv narxi: $0.5. Undan past narx serverda rad etiladi.
          </p>

          {suggestedPrice && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <button
                className="btn btn-steam"
                style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(74,222,128,0.4)', color: 'var(--green)' }}
                onClick={onInstantSell}
                disabled={instantSelling}
              >
                <Zap size={15} /> {instantSelling
                  ? 'Yuborilmoqda...'
                  : `Tezkor Sotish — darhol $${(suggestedPrice * 0.5).toFixed(2)}`}
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
