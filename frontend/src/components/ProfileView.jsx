import React, { useState } from 'react';
import { User, Wallet, ShieldCheck, ExternalLink, LogOut, Link2, AlertTriangle, CheckCircle2, Tag, Copy, Check } from 'lucide-react';

// Same tier-color language as the VIP store, so a Gold user's profile glows
// the same gold as the Gold card they bought.
const TIER_STYLES = {
  'VIP Silver': { color: '#a0aec0', icon: ShieldCheck },
  'VIP Gold': { color: '#ffa300', icon: ShieldCheck },
  'VIP Diamond': { color: '#5a80f2', icon: ShieldCheck },
};
const DEFAULT_TIER = { color: '#8b5cf6', icon: ShieldCheck };

export function ProfileView({ user, onLogout, onOpenPayme, setActiveTab }) {
  const [avatarError, setAvatarError] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const tier = TIER_STYLES[user.vipRole] || DEFAULT_TIER;
  const TierIcon = tier.icon;
  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.steamId}`;

  const copySteamId = () => {
    navigator.clipboard.writeText(user.steamId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ maxWidth: '820px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Profile Header Card */}
      <div
        className="card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${tier.color}14, rgba(20, 22, 31, 0.95) 55%)`,
          border: `1px solid ${tier.color}4d`,
          padding: '32px',
        }}
      >
        {/* soft glow accent, top-right */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px',
          background: `radial-gradient(closest-side, ${tier.color}33, transparent 70%)`, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <img
            src={avatarError ? fallbackAvatar : user.avatarUrl}
            alt={user.displayName}
            onError={() => setAvatarError(true)}
            style={{
              width: '96px', height: '96px', borderRadius: '16px',
              border: `2px solid ${tier.color}`, boxShadow: `0 0 24px ${tier.color}66`,
              objectFit: 'cover', background: '#0b0d14',
            }}
          />
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '800' }}>{user.displayName}</h2>
              <span style={{
                background: `linear-gradient(135deg, ${tier.color}, ${tier.color}bb)`,
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0b0d14',
              }}>
                <TierIcon size={12} /> {user.vipRole || "Oddiy O'yinchi"}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Steam ID: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{user.steamId}</span>
              </p>
              <button
                onClick={copySteamId}
                title="Nusxalash"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text-muted)',
                  display: 'inline-flex', alignItems: 'center', padding: 0,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

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

        {/* Balance & Trade Link status row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative' }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Wallet size={20} color="var(--money)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Joriy Balans</div>
              <div style={{ fontSize: '21px', fontWeight: '800', color: 'var(--money)', marginTop: '2px' }}>
                {Number(user.balance ?? 0).toLocaleString()} UZS
              </div>
            </div>
          </div>

          <div
            onClick={() => setActiveTab?.('skins')}
            style={{
              background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px',
              border: `1px solid ${user.tradeUrl ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
              display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
            }}
          >
            {user.tradeUrl
              ? <CheckCircle2 size={20} color="var(--green)" style={{ flexShrink: 0 }} />
              : <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trade Link</div>
              <div style={{ fontSize: '13px', fontWeight: '700', marginTop: '2px', color: user.tradeUrl ? 'var(--green)' : '#f87171' }}>
                {user.tradeUrl ? 'Bog\'langan' : 'Kiritilmagan — bosing'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
          <button className="btn btn-wallet" style={{ flex: '1 1 200px', justifyContent: 'center' }} onClick={onOpenPayme}>
            <Wallet size={15} /> Balansni To'ldirish
          </button>
          <button className="btn btn-steam" style={{ flex: '1 1 200px', justifyContent: 'center' }} onClick={() => setActiveTab?.('skins')}>
            <Tag size={15} /> Skin Sotish / Sotib Olish
          </button>
          <button
            className="btn btn-steam"
            style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171', justifyContent: 'center' }}
            onClick={onLogout}
          >
            <LogOut size={15} /> Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}
