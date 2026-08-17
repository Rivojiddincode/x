import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, AlertTriangle, PackageSearch, Users, ShieldBan, MessageSquare,
  Loader2, CheckCircle2, Search, X,
} from 'lucide-react';
import { authFetch } from '../api/client';

const TABS = [
  { id: 'dashboard', label: 'Umumiy', icon: LayoutDashboard },
  { id: 'flagged', label: 'E\'tibor talab', icon: AlertTriangle },
  { id: 'botstock', label: 'Bot Zaxira', icon: PackageSearch },
  { id: 'users', label: 'Foydalanuvchilar', icon: Users },
  { id: 'bans', label: 'Banlar', icon: ShieldBan },
  { id: 'requests', label: 'Murojaatlar', icon: MessageSquare },
];

export function AdminView({ onToast }) {
  const [tab, setTab] = useState('dashboard');

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="btn"
              style={{
                background: tab === t.id ? 'var(--span)' : 'rgba(255,255,255,0.04)',
                color: tab === t.id ? '#0b0d14' : '#fff',
                border: '1px solid var(--card-border)',
              }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <DashboardTab onToast={onToast} />}
      {tab === 'flagged' && <FlaggedTab onToast={onToast} />}
      {tab === 'botstock' && <BotStockTab onToast={onToast} />}
      {tab === 'users' && <UsersTab onToast={onToast} />}
      {tab === 'bans' && <BansTab onToast={onToast} />}
      {tab === 'requests' && <RequestsTab onToast={onToast} />}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '18px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: color || '#fff', fontFamily: 'var(--font-heading)', marginTop: '4px' }}>
        {value}
      </div>
    </div>
  );
}

function DashboardTab({ onToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/admin/stats')
      .then((d) => { if (d.success) setStats(d.stats); else onToast?.(d.message); })
      .catch(() => onToast?.('Statistika yuklanmadi'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="spin" />;
  if (!stats) return <p style={{ color: 'var(--text-muted)' }}>Ma'lumot yo'q</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
      <StatCard label="Foydalanuvchilar" value={stats.userCount} />
      <StatCard label="E'tibor talab bitimlar" value={stats.needsReviewCount} color={stats.needsReviewCount > 0 ? 'var(--red)' : 'var(--green)'} />
      <StatCard label="Bot zaxirasi" value={stats.botStockCount} color="var(--money)" />
      <StatCard label="Aktiv listinglar" value={stats.activeListingCount} color="var(--span)" />
      <StatCard label="Murojaatlar" value={stats.pendingRequestCount} />
      <StatCard label="Jami balans (UZS)" value={Number(stats.totalBalanceUZS).toLocaleString()} color="var(--money)" />
    </div>
  );
}

function FlaggedTab({ onToast }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const load = () => {
    setLoading(true);
    authFetch('/admin/transactions/flagged')
      .then((d) => { if (d.success) setTxs(d.transactions); })
      .catch(() => onToast?.('Yuklanmadi'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resolve = async (id) => {
    setResolvingId(id);
    const d = await authFetch(`/admin/transactions/${id}/resolve`, { method: 'POST' });
    if (d.success) { onToast?.('Bitim hal qilindi deb belgilandi'); load(); }
    else onToast?.(d.message || 'Xatolik');
    setResolvingId(null);
  };

  if (loading) return <Loader2 className="spin" />;
  if (txs.length === 0) return <p style={{ color: 'var(--text-muted)' }}>E'tibor talab qiladigan bitim yo'q ✅</p>;

  return (
    <div className="table-card">
      <table className="table">
        <thead><tr><th>#</th><th>Item</th><th>Narx</th><th>Sotuvchi</th><th>Xaridor</th><th>Sabab</th><th></th></tr></thead>
        <tbody>
          {txs.map((tx) => (
            <tr key={tx.id}>
              <td>#{tx.id}</td>
              <td>{tx.listing?.marketHashName}</td>
              <td style={{ color: 'var(--money)' }}>${tx.price}</td>
              <td>{tx.seller?.displayName}</td>
              <td>{tx.buyer?.displayName}</td>
              <td style={{ color: 'var(--red)', fontSize: '12px' }}>{tx.failReason}</td>
              <td>
                <button className="btn btn-wallet" disabled={resolvingId === tx.id} onClick={() => resolve(tx.id)}>
                  <CheckCircle2 size={13} /> Hal qilindi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BotStockTab({ onToast }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({});
  const [resellingId, setResellingId] = useState(null);

  const load = () => {
    setLoading(true);
    authFetch('/admin/bot-stock')
      .then((d) => { if (d.success) setListings(d.listings); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resell = async (id) => {
    const price = prices[id];
    if (!price || Number(price) < 0.5) return onToast?.('Narx kamida $0.5 bo\'lishi kerak');
    setResellingId(id);
    const d = await authFetch(`/admin/bot-stock/${id}/resell`, { method: 'POST', body: JSON.stringify({ price }) });
    if (d.success) { onToast?.('Item qayta sotuvga qo\'yildi'); load(); }
    else onToast?.(d.message || 'Xatolik');
    setResellingId(null);
  };

  if (loading) return <Loader2 className="spin" />;
  if (listings.length === 0) return <p style={{ color: 'var(--text-muted)' }}>Bot zaxirasida item yo'q</p>;

  return (
    <div className="grid">
      {listings.map((l) => (
        <div key={l.id} className="card">
          <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', marginBottom: '8px' }}>
            {l.iconUrl && <img src={l.iconUrl} alt="" style={{ maxHeight: '90%' }} />}
          </div>
          <p style={{ fontSize: '12px', marginBottom: '8px' }}>{l.marketHashName}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Instant-sell narxi edi: ${l.price}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number" min="0.5" step="0.01" placeholder="Yangi narx"
              value={prices[l.id] || ''}
              onChange={(e) => setPrices((p) => ({ ...p, [l.id]: e.target.value }))}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff', fontSize: '12px' }}
            />
            <button className="btn btn-wallet" disabled={resellingId === l.id} onClick={() => resell(l.id)}>Sotuvga</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab({ onToast }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const load = () => {
    setLoading(true);
    authFetch(`/admin/users?search=${encodeURIComponent(search)}`)
      .then((d) => { if (d.success) setUsers(d.users); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const saveUser = async (steamId, patch) => {
    const d = await authFetch(`/admin/users/${steamId}`, { method: 'PATCH', body: JSON.stringify(patch) });
    if (d.success) { onToast?.('Saqlandi'); setEditingUser(null); load(); }
    else onToast?.(d.message || 'Xatolik');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          placeholder="Ism yoki SteamID bo'yicha qidirish..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff' }}
        />
        <button className="btn btn-steam" onClick={load}><Search size={14} /> Qidirish</button>
      </div>

      {loading ? <Loader2 className="spin" /> : (
        <div className="table-card">
          <table className="table">
            <thead><tr><th>O'yinchi</th><th>SteamID</th><th>Balans</th><th>VIP</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.steamId}>
                  <td>{u.displayName} {u.ban && <ShieldBan size={12} color="var(--red)" style={{ marginLeft: '4px' }} />}</td>
                  <td><code style={{ fontSize: '11px' }}>{u.steamId}</code></td>
                  <td style={{ color: 'var(--money)' }}>{u.balance.toLocaleString()}</td>
                  <td>{u.vipRole}</td>
                  <td>{u.score}</td>
                  <td><button className="btn btn-steam" onClick={() => setEditingUser(u)}>Tahrirlash</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={saveUser} />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    balance: user.balance, vipRole: user.vipRole,
    kills: user.kills, deaths: user.deaths, score: user.score, level: user.level,
    headshotPct: user.headshotPct, winRate: user.winRate,
  });

  const field = (key, label) => (
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</label>
      <input
        type="number" value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff' }}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="card" style={{ width: '360px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 className="card-title">{user.displayName}</h3>
          <X size={18} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        {field('balance', 'Balans (UZS)')}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>VIP Rol</label>
          <input
            value={form.vipRole}
            onChange={(e) => setForm((f) => ({ ...f, vipRole: e.target.value }))}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff' }}
          />
        </div>
        {field('kills', 'Kills')}
        {field('deaths', 'Deaths')}
        {field('score', 'Score')}
        {field('level', 'Level')}
        {field('headshotPct', 'Headshot %')}
        {field('winRate', 'Win Rate %')}
        <button className="btn btn-wallet" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onSave(user.steamId, form)}>
          Saqlash
        </button>
      </div>
    </div>
  );
}

function BansTab({ onToast }) {
  const [form, setForm] = useState({ steamId: '', reason: '', durationDays: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const d = await authFetch('/admin/bans', { method: 'POST', body: JSON.stringify(form) });
    if (d.success) { onToast?.('Ban qo\'llandi'); setForm({ steamId: '', reason: '', durationDays: '' }); }
    else onToast?.(d.message || 'Xatolik');
    setSubmitting(false);
  };

  const unban = async () => {
    if (!form.steamId) return onToast?.('SteamID kiriting');
    const d = await authFetch(`/admin/bans/${form.steamId}`, { method: 'DELETE' });
    if (d.success) onToast?.('Ban bekor qilindi');
    else onToast?.(d.message || 'Xatolik');
  };

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: '420px' }}>
      <h3 className="card-title" style={{ marginBottom: '12px' }}>Ban qo'llash / bekor qilish</h3>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SteamID</label>
        <input required value={form.steamId} onChange={(e) => setForm((f) => ({ ...f, steamId: e.target.value }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff' }} />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sabab</label>
        <input required value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff' }} />
      </div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Muddat (kun, bo'sh = doimiy)</label>
        <input type="number" value={form.durationDays} onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--card-border)', color: '#fff' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn btn-wallet" disabled={submitting} style={{ flex: 1, justifyContent: 'center' }}>Ban qilish</button>
        <button type="button" className="btn btn-steam" onClick={unban} style={{ flex: 1, justifyContent: 'center' }}>Bekor qilish</button>
      </div>
    </form>
  );
}

function RequestsTab({ onToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/admin/requests')
      .then((d) => { if (d.success) setRequests(d.requests); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="spin" />;
  if (requests.length === 0) return <p style={{ color: 'var(--text-muted)' }}>Murojaatlar yo'q</p>;

  return (
    <div className="table-card">
      <table className="table">
        <thead><tr><th>Ism</th><th>Telegram</th><th>Turi</th><th>Xabar</th><th>Sana</th></tr></thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.telegram}</td>
              <td>{r.type}</td>
              <td style={{ fontSize: '12px', maxWidth: '260px' }}>{r.message}</td>
              <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
