import React, { useState, useEffect } from 'react';
import { Link2, Tag, ShoppingCart, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../api/client';

export function SkinMarketView({ user, onToast }) {
  const [subTab, setSubTab] = useState('shop'); // 'shop' | 'sell'
  const [tradeUrl, setTradeUrl] = useState(user?.tradeUrl || '');
  const [savingTradeUrl, setSavingTradeUrl] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [listPrice, setListPrice] = useState('');
  const [creatingListing, setCreatingListing] = useState(false);

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  useEffect(() => {
    fetchListings();
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
      const res = await fetch(`${API_BASE}/market/trade-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId: user.steamId, tradeUrl }),
      });
      const data = await res.json();
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
      const res = await fetch(`${API_BASE}/market/inventory/${user.steamId}`);
      const data = await res.json();
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

  const createListing = async () => {
    if (!selectedItem) return;
    const price = Number(listPrice);
    if (!price || price < 0.5) {
      return onToast?.('Minimal narx $0.5');
    }
    setCreatingListing(true);
    try {
      const res = await fetch(`${API_BASE}/market/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerSteamId: user.steamId,
          assetId: selectedItem.assetId,
          classId: selectedItem.classId,
          instanceId: selectedItem.instanceId,
          marketHashName: selectedItem.marketHashName,
          iconUrl: selectedItem.iconUrl,
          price,
        }),
      });
      const data = await res.json();
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

  const buyListing = async (listing) => {
    if (!user) return onToast?.('Avval Steam orqali kiring');
    if (!user.tradeUrl) return onToast?.('Avval "Sotish" bo\'limida trade link kiriting');
    setBuyingId(listing.id);
    try {
      const res = await fetch(`${API_BASE}/market/listings/${listing.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerSteamId: user.steamId }),
      });
      const data = await res.json();
      if (data.success) {
        onToast?.(data.message);
        fetchListings();
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
          setSelectedItem={setSelectedItem}
          listPrice={listPrice}
          setListPrice={setListPrice}
          onCreateListing={createListing}
          creatingListing={creatingListing}
        />
      )}
    </div>
  );
}

function ShopTab({ listings, loading, onBuy, buyingId, onRefresh }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Barcha narxlar sobit — tasodifiy natijaga asoslangan xarid mavjud emas.
        </p>
        <button className="btn btn-steam" onClick={onRefresh}>
          <RefreshCw size={14} /> Yangilash
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Yuklanmoqda...</p>
      ) : listings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Hozircha sotuvda skin yo'q. Birinchi bo'lib siz sotuvga qo'ying!</p>
        </div>
      ) : (
        <div className="grid">
          {listings.map((listing) => (
            <div key={listing.id} className="card">
              <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginBottom: '12px' }}>
                {listing.iconUrl ? (
                  <img src={listing.iconUrl} alt={listing.marketHashName} style={{ maxHeight: '90%', maxWidth: '90%' }} />
                ) : (
                  <Tag size={32} color="var(--text-muted)" />
                )}
              </div>
              <h3 className="card-title" style={{ fontSize: '14px' }}>{listing.marketHashName}</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                Sotuvchi: {listing.seller?.displayName || 'Noma\'lum'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--money)' }}>${listing.price.toFixed(2)}</span>
                <button
                  className="btn btn-wallet"
                  disabled={buyingId === listing.id}
                  onClick={() => onBuy(listing)}
                >
                  {buyingId === listing.id ? 'Yuborilmoqda...' : 'Sotib olish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SellTab({
  user, tradeUrl, setTradeUrl, savingTradeUrl, onSaveTradeUrl,
  inventory, loadingInventory, onLoadInventory,
  selectedItem, setSelectedItem, listPrice, setListPrice,
  onCreateListing, creatingListing,
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
                  cursor: 'pointer',
                  borderColor: selectedItem?.assetId === item.assetId ? 'var(--money)' : 'var(--card-border)',
                  padding: '12px',
                }}
                onClick={() => setSelectedItem(item)}
              >
                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginBottom: '8px' }}>
                  {item.iconUrl ? <img src={item.iconUrl} alt={item.marketHashName} style={{ maxHeight: '90%', maxWidth: '90%' }} /> : <Tag size={24} color="var(--text-muted)" />}
                </div>
                <p style={{ fontSize: '11px', textAlign: 'center' }}>{item.marketHashName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listing form */}
      {selectedItem && (
        <div className="card">
          <h3 className="card-title" style={{ fontSize: '15px' }}>Sotuvga qo'yish: {selectedItem.marketHashName}</h3>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
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
        </div>
      )}
    </div>
  );
}
