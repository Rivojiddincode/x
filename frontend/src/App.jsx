import React, { useState, useEffect } from 'react';
import { apiClient } from './api/client';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import { ServerList } from './components/ServerList';
import { StoreView } from './components/StoreView';
import { LeaderboardView } from './components/LeaderboardView';
import { BansView, RequestsView } from './components/BansView';
import { ProfileView } from './components/ProfileView';
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
  const [user, setUser] = useState(null);

  // Request Form State
  const [reqForm, setReqForm] = useState({ name: '', telegram: '', type: 'admin', message: '' });

  useEffect(() => {
    // Check Steam OpenID URL Callback Params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('steamAuth') === 'success') {
      const steamId = urlParams.get('steamId');
      const name = urlParams.get('name');
      const avatar = urlParams.get('avatar');
      
      setUser({
        steamId,
        displayName: name || 'Steam Player',
        avatarUrl: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${steamId}`,
        balance: 50000,
        vipRole: 'VIP Diamond'
      });
      setActiveTab('profile');
      showToastMsg(`Steam rasmiy avtorizatsiyasi muvaffaqiyatli! Xush kelibsiz, ${name}!`);
      // Clean query params from URL bar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchServers();
    fetchStore();
    fetchLeaderboard();
    fetchBans();
  }, [serverFilter]);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchServers = async () => {
    try {
      const data = await apiClient.getServers(serverFilter);
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

  // Direct 1-Click Redirect to Official Steam OpenID Auth Page
  const handleSteamLogin = () => {
    const origin = window.location.origin;
    const returnTo = `${origin}/api/v1/auth/steam/callback`;

    const openIdUrl = `https://steamcommunity.com/openid/login?` + new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': origin,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    }).toString();

    // Directly open Steam official login page
    window.location.href = openIdUrl;
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

      {/* Modular Hero */}
      <Hero totalOnline={totalOnline} />

      {/* Main View Components */}
      <main className="main container">
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

        {activeTab === 'profile' && (
          <ProfileView 
            user={user} 
            onLogout={() => { setUser(null); showToastMsg('Tizimdan chiqildi.'); setActiveTab('servers'); }} 
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
