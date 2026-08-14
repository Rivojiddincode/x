import React, { useState, useEffect } from 'react';
import { apiClient, API_BASE } from './api/client';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { ServerList } from './components/ServerList';
import { StoreView } from './components/StoreView';
import { LeaderboardView } from './components/LeaderboardView';
import { BansView, RequestsView } from './components/BansView';
import { ProfileView } from './components/ProfileView';
import { SkinMarketView } from './components/SkinMarketView';
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
  
  // Modals
  const [showPaymeModal, setShowPaymeModal] = useState(false);
  const [paymeAmount, setPaymeAmount] = useState(50000);
  const [paymeSteamId, setPaymeSteamId] = useState('STEAM_1:0:9823412');

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

  useEffect(() => {
    // Check Steam OpenID URL Callback Params & Sync with Database
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('steamAuth') === 'success') {
      const steamId = urlParams.get('steamId') || '76561198012345678';
      const name = urlParams.get('name') || 'Steam Player';
      const avatar = urlParams.get('avatar') || `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`;
      const balance = Number(urlParams.get('balance') ?? 0);
      const vipRole = urlParams.get('vipRole') || "Oddiy O'yinchi";

      const userData = {
        steamId,
        displayName: name,
        avatarUrl: avatar,
        profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        balance,
        vipRole
      };

      // Sync to Database
      fetch(`${API_BASE}/auth/steam/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
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
      // Fetch user from Database on load
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

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('starscs_user');
    localStorage.removeItem('starscs_steam_id');
    showToastMsg('Tizimdan chiqildi.');
    setActiveTab('servers');
  };

  const fetchServers = async () => {
    try {
      // Always fetch the full list — filtering by mode now happens client-side
      // (GameModeGrid needs to see every mode at once to render its tiles/counts).
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

  const handlePaymeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.createPaymeCharge({ steamId: paymeSteamId, amount: paymeAmount });
      if (res.success) {
        showToastMsg(`Payme gateway silkasi: ${res.checkoutUrl.slice(0, 45)}...`);
        setShowPaymeModal(false);
      }
    } catch (e) {
      showToastMsg('Payme to\'lov xatoligi yuz berdi');
    }
  };

  // Real Steam OpenID Login Handler — redirects to Steam's actual login page
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
        onOpenPayme={() => setShowPaymeModal(true)}
        onOpenSteam={handleSteamLogin}
        user={user}
      />

      {/* Hero Section - ONLY rendered on the main servers page */}
      {activeTab === 'servers' && <Hero totalOnline={totalOnline} />}

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
          <StoreView 
            storeItems={storeItems} 
            onBuy={(price) => { setPaymeAmount(price); setShowPaymeModal(true); }} 
          />
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
            onOpenPayme={() => setShowPaymeModal(true)} 
          />
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

      {/* Payme Checkout Modal */}
      {showPaymeModal && (
        <div className="modal">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>⭐ StarsCS Payme Balansni To'ldirish</h3>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }} onClick={() => setShowPaymeModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePaymeSubmit}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Steam ID</label>
                <input className="form-input" value={paymeSteamId} onChange={e => setPaymeSteamId(e.target.value)} required />
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Summa (UZS)</label>
                <input className="form-input" type="number" value={paymeAmount} onChange={e => setPaymeAmount(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-wallet" style={{ width: '100%', marginTop: '20px' }}>Payme To'loviga O'tish</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
