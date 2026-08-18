import React, { useState, useEffect } from 'react';
import { apiClient, API_BASE, authFetch } from './api/client';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { ServerList } from './components/ServerList';
import { StoreView } from './components/StoreView';
import { LeaderboardView } from './components/LeaderboardView';
import { BansView, RequestsView } from './components/BansView';
import { ProfileView } from './components/ProfileView';
import { SkinMarketView } from './components/SkinMarketView';
import { AdminView } from './components/AdminView';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalPages';
import './styles/main.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('servers');
  const [servers, setServers] = useState([]);
  const [totalOnline, setTotalOnline] = useState(224);
  const [serverFilter, setServerFilter] = useState('all');
  const [storeItems, setStoreItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bans, setBans] = useState([]);
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // null | 'terms' | 'privacy'
  
  // inPAY Modal State
  const [showInpayModal, setShowInpayModal] = useState(false);
  const [inpayAmount, setInpayAmount] = useState(50000);
  const [inpayMethod, setInpayMethod] = useState(''); // '' = foydalanuvchi tanlaydi
  const [inpayLoading, setInpayLoading] = useState(false);
  const [inpayError, setInpayError] = useState('');

  // Persistent User State from localStorage
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('starscs_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Request Form State
  const [reqForm, setReqForm] = useState({ name: '', telegram: '', type: 'admin', message: '' });

  // To'lovdan qaytib kelgandagi tekshiruv — agar tugallanmagan (pending) buyurtma bo'lsa,
  // webhook hali kelmagan bo'lishi mumkin (kechikish yoki xatolik). Shuni fallback
  // sifatida tekshirib, foydalanuvchini "osilib qolgan" holatda qoldirmaymiz.
  useEffect(() => {
    const pendingOrderId = localStorage.getItem('starscs_pending_order');
    if (!pendingOrderId) return;

    const token = localStorage.getItem('starscs_token');
    if (!token) {
      localStorage.removeItem('starscs_pending_order');
      return;
    }

    let attempts = 0;
    const checkStatus = () => {
      attempts += 1;
      authFetch(`/payments/inpay/status/${pendingOrderId}`)
        .then((d) => {
          if (!d.success) {
            localStorage.removeItem('starscs_pending_order');
            return;
          }
          if (d.status === 'success') {
            showToastMsg(`✅ To'lov muvaffaqiyatli! Balansingiz ${Number(d.amount).toLocaleString()} UZS'ga to'ldi.`);
            setUser((prev) => prev ? { ...prev, balance: (prev.balance || 0) + Number(d.amount) } : prev);
            localStorage.removeItem('starscs_pending_order');
          } else if (d.status === 'pending' && attempts < 5) {
            setTimeout(checkStatus, 4000); // 4 soniyadan keyin qayta urinib ko'ramiz (jami ~20 soniya)
          } else {
            // failed / cancelled / juda uzoq pending qoldi
            localStorage.removeItem('starscs_pending_order');
          }
        })
        .catch(() => localStorage.removeItem('starscs_pending_order'));
    };
    checkStatus();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('steamAuth') === 'success') {
      const steamId = urlParams.get('steamId') || '76561198012345678';
      const name = urlParams.get('name') || 'Steam Player';
      const avatar = urlParams.get('avatar') || `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`;
      const balance = Number(urlParams.get('balance') ?? 0);
      const vipRole = urlParams.get('vipRole') || "Oddiy O'yinchi";
      const token = urlParams.get('token');

      if (token) {
        localStorage.setItem('starscs_token', token);
      }

      const userData = {
        steamId,
        displayName: name,
        avatarUrl: avatar,
        profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        balance,
        vipRole
      };

      fetch(`${API_BASE}/auth/steam/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ displayName: name, avatarUrl: avatar })
      }).catch(err => console.log('DB sync offline'));

      setUser(userData);
      localStorage.setItem('starscs_user', JSON.stringify(userData));
      localStorage.setItem('starscs_steam_id', steamId);
      setActiveTab('profile');
      showToastMsg(`Steam orqali muvaffaqiyatli kirdingiz! Xush kelibsiz, ${userData.displayName}!`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('steamAuth') === 'error') {
      const msg = urlParams.get('message') || 'Steam avtorizatsiyasida xatolik yuz berdi';
      showToastMsg(`Steam xatoligi: ${msg}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const savedSteamId = localStorage.getItem('starscs_steam_id');
      if (savedSteamId) {
        fetch(`${API_BASE}/auth/steam/user/${savedSteamId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.user) {
              setUser(data.user);
            }
          })
          .catch(err => console.log('Could not fetch user from DB:', err));
      }
    }

    fetchServers();
    fetchStore();
    fetchLeaderboard();
    fetchBans();
  }, []);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    authFetch('/admin/check')
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [user?.steamId]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('starscs_user');
    localStorage.removeItem('starscs_steam_id');
    localStorage.removeItem('starscs_token');
    showToastMsg('Tizimdan chiqildi.');
    setActiveTab('servers');
  };

  const fetchServers = async () => {
    try {
      const data = await apiClient.getServers('all');
      if (data.success) {
        setServers(data.servers);
        setTotalOnline(data.totalOnline);
      }
    } catch (e) {
      console.error('API Server Fetch Error:', e);
    }
  };

  const fetchStore = async () => {
    try {
      const data = await apiClient.getStore();
      if (data.success) setStoreItems(data.items);
    } catch (e) {
      console.error('API Store Fetch Error:', e);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await apiClient.getLeaderboard();
      if (data.success) setLeaderboard(data.players);
    } catch (e) {
      console.error('API Leaderboard Fetch Error:', e);
    }
  };

  const fetchBans = async () => {
    try {
      const data = await apiClient.getBans();
      if (data.success) setBans(data.bans);
    } catch (e) {
      console.error('API Bans Fetch Error:', e);
    }
  };

  const handleInpaySubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setInpayError("Avval Steam orqali tizimga kiring!");
      return;
    }
    setInpayLoading(true);
    setInpayError('');
    try {
      const res = await apiClient.createInpayCharge({
        amount: Number(inpayAmount),
        paymentMethod: inpayMethod || undefined,
      });
      if (res.success && res.payUrl) {
        localStorage.setItem('starscs_pending_order', res.orderId);
        window.location.href = res.payUrl;
      } else {
        setInpayError(res.message || "To'lov yaratishda xatolik");
      }
    } catch (err) {
      // Render bepul plan'da server uxlab qoladi — birinchi so'rovda 30-60s kechikish bo'ladi
      setInpayError("Server javob bermadi. Iltimos 30 soniya kuting va qayta urining.");
    } finally {
      setInpayLoading(false);
    }
  };

  const handleBuyVip = async (tierId, displayPrice) => {
    if (!user) {
      showToastMsg('Avval Steam orqali kiring');
      return;
    }
    try {
      const res = await apiClient.buyVipTier(tierId);
      if (res.success) {
        showToastMsg(res.message);
        setUser((prev) => ({ ...prev, balance: res.user.balance, vipRole: res.user.vipRole }));
        localStorage.setItem('starscs_user', JSON.stringify({ ...user, balance: res.user.balance, vipRole: res.user.vipRole }));
      } else if (res.needsTopUp) {
        showToastMsg(res.message + " — balansni to'ldiring.");
        setInpayAmount(res.shortfall);
        setInpayError('');
        setShowInpayModal(true);
      } else {
        showToastMsg(res.message || "Xarid qilib bo'lmadi");
      }
    } catch (e) {
      showToastMsg("Serverga ulanib bo'lmadi");
    }
  };


  const handleSteamLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/steam/login-url?frontend=${encodeURIComponent(window.location.origin)}`);
      const data = await res.json();
      if (data.success && data.openIdUrl) {
        window.location.href = data.openIdUrl;
      } else {
        showToastMsg('Steam login havolasini olishda xatolik yuz berdi');
      }
    } catch (err) {
      showToastMsg('Steam bilan bog\'lanib bo\'mladi. Internetni tekshiring.');
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.submitRequest(reqForm);
      if (res.success) {
        showToastMsg('Murojaatingiz backend serverga qabul qilindi!');
        setReqForm({ name: '', telegram: '', type: 'admin', message: '' });
      }
    } catch (e) {
      showToastMsg('Murojaat yuborishda xatolik');
    }
  };

  return (
    <div className="app">
      {/* Toast Notification */}
      {toast && <div className="toast">{toast}</div>}

      {/* Modular Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        totalOnline={totalOnline}
        onOpenPayme={() => { setInpayError(''); setShowInpayModal(true); }}
        onOpenSteam={handleSteamLogin}
        user={user}
        isAdmin={isAdmin}
      />

      {/* Hero Section */}
      {activeTab === 'servers' && <Hero totalOnline={totalOnline} serverCount={servers.length} />}

      {/* Main View Components */}
      <main className="main container" style={{ marginTop: activeTab !== 'servers' ? '32px' : '0' }}>
        {activeTab === 'servers' && (
          <ServerList 
            servers={servers} 
            serverFilter={serverFilter} 
            setServerFilter={setServerFilter} 
            onToast={showToastMsg} 
          />
        )}
        {activeTab === 'store' && (
          <StoreView storeItems={storeItems} onBuy={handleBuyVip} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView leaderboard={leaderboard} />
        )}
        {activeTab === 'skins' && (
          <SkinMarketView user={user} onToast={showToastMsg} />
        )}
        {activeTab === 'profile' && (
          <ProfileView 
            user={user} 
            onLogout={handleLogout} 
            onOpenPayme={() => { setInpayError(''); setShowInpayModal(true); }} 
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminView onToast={showToastMsg} />
        )}
        {activeTab === 'bans' && (
          <BansView bans={bans} />
        )}
        {activeTab === 'requests' && (
          <RequestsView 
            reqForm={reqForm} 
            setReqForm={setReqForm} 
            onSubmit={handleRequestSubmit} 
          />
        )}
      </main>

      {/* inPAY Checkout Modal */}
      {showInpayModal && (
        <div className="modal">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span style={{ fontSize: '20px' }}>💳</span> Balansni To'ldirish
              </h3>
              <button
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}
                onClick={() => setShowInpayModal(false)}
              >✕</button>
            </div>

            <form onSubmit={handleInpaySubmit}>
              {/* To'lov usuli */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  To'lov usuli
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[{ value: '', label: '🏪 Tanlash' }, { value: 'click', label: '🟦 Click' }, { value: 'payme', label: '🔵 Payme' }, { value: 'cardsystem', label: '💳 Karta' }].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInpayMethod(opt.value)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '8px',
                        border: `1.5px solid ${inpayMethod === opt.value ? 'var(--span)' : 'var(--card-border)'}`,
                        background: inpayMethod === opt.value ? 'rgba(var(--span-rgb, 99,102,241),0.15)' : 'var(--card-bg)',
                        color: inpayMethod === opt.value ? 'var(--span)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: inpayMethod === opt.value ? '700' : '400',
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summa */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Summa (UZS) — minimum 1 000
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="1000"
                  step="1000"
                  value={inpayAmount}
                  onChange={e => setInpayAmount(e.target.value)}
                  required
                />
                {/* Tezkor summa tugmalari */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {[20000, 50000, 100000, 200000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInpayAmount(amt)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--card-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Xatolik */}
              {inpayError && (
                <p style={{ color: '#ff4444', fontSize: '13px', marginBottom: '12px', background: '#ff44441a', padding: '8px 12px', borderRadius: '8px' }}>
                  ⚠️ {inpayError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-wallet"
                disabled={inpayLoading}
                style={{ width: '100%', marginTop: '4px', opacity: inpayLoading ? 0.7 : 1 }}
              >
                {inpayLoading ? '⏳ Yuklanmoqda...' : `💳 To'lovga O'tish — ${Number(inpayAmount).toLocaleString()} UZS`}
              </button>

              <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
                inPAY orqali xavfsiz to'lov • Click • Payme • Bank kartasi
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Footer with Legal Links */}
      <Footer onOpenTerms={() => setLegalModal('terms')} onOpenPrivacy={() => setLegalModal('privacy')} />

      {/* Legal Modal */}
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
