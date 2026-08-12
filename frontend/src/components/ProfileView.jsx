import React from 'react';
import { User, Wallet, ShieldCheck, ExternalLink, LogOut } from 'lucide-react';

export function ProfileView({ user, onLogout, onOpenPayme }) {
  if (!user) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '500px', margin: '40px auto' }}>
        <User size={48} color="var(--span)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px' }}>Steam Akkaunt Bilan Kirilmagan</h2>
        <p style={{ color: 'var(--text-muted)', margin: '12px 0 24px' }}>
          Profil ma'lumotlaringiz, balans va VIP imtiyozlaringizni ko'rish uchun Steam orqali tizimga kiring.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto' }}>
      {/* Profile Header Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(20, 22, 31, 0.95), rgba(30, 35, 50, 0.9))', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <img 
            src={user.avatarUrl} 
            alt={user.displayName} 
            style={{ width: '96px', height: '96px', borderRadius: '16px', border: '2px solid var(--purple)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '800' }}>{user.displayName}</h2>
              <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> {user.vipRole || 'VIP Diamond'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px' }}>
              Steam ID: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{user.steamId}</span>
            </p>
            {user.profileUrl && (
              <a 
                href={user.profileUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: 'var(--span)', fontSize: '12.5px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}
              >
                Steam Community Profiliga O'tish <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Balance & Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Joriy Balans</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--money)', marginTop: '4px' }}>
              {(user.balance || 50000).toLocaleString()} UZS
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-wallet" style={{ width: '100%', justifyContent: 'center' }} onClick={onOpenPayme}>
              <Wallet size={15} /> Balansni To'ldirish
            </button>
            <button className="btn btn-steam" style={{ width: '100%', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }} onClick={onLogout}>
              <LogOut size={15} /> Chiqish (Logout)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
