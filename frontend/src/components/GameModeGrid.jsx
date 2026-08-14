import React from 'react';
import {
  LayoutGrid, Users, ShieldAlert, Swords, Crosshair, Target,
  Gamepad2, Rocket, Waves, Sparkles,
} from 'lucide-react';

// Per-mode visual identity: icon + a gradient pair drawn from the app's
// existing accent palette (--span blue, --money orange, --green, --red, --purple)
// plus a couple of extended hues so all 9 tiles read as distinct at a glance.
const MODE_STYLES = {
  '5x5': { icon: Users, from: '#3b82f6', to: '#1e3a8a' },
  RETAKE: { icon: ShieldAlert, from: '#f87171', to: '#7f1d1d' },
  DUELS: { icon: Swords, from: '#8b5cf6', to: '#3b0764' },
  DM: { icon: Crosshair, from: '#ffa300', to: '#7c3e00' },
  AWP: { icon: Target, from: '#22d3ee', to: '#0e4a55' },
  MINIGAME: { icon: Gamepad2, from: '#f472b6', to: '#701a44' },
  'BHOP & KZ': { icon: Rocket, from: '#4ade80', to: '#14532d' },
  SURF: { icon: Waves, from: '#38bdf8', to: '#0c4a6e' },
  MODELLAR: { icon: Sparkles, from: '#fbbf24', to: '#78350f' },
};
const FALLBACK_STYLE = { icon: Gamepad2, from: '#3b82f6', to: '#1e293b' };

function Tile({ label, sublabel, icon: Icon, from, to, active, onClick, big }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        gridColumn: big ? 'span 2' : 'span 1',
        aspectRatio: big ? '2.15 / 1' : '1.05 / 1',
        borderRadius: 'var(--radius)',
        border: active ? '2px solid var(--span)' : '1px solid var(--card-border)',
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        textAlign: 'left',
        background: `linear-gradient(155deg, ${from}33 0%, ${to}f2 68%, #05060a 100%)`,
        boxShadow: active ? `0 0 0 1px ${from}66, 0 12px 28px -8px ${from}55` : '0 6px 16px -8px rgba(0,0,0,0.5)',
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <Icon
        size={big ? 108 : 76}
        strokeWidth={1.3}
        style={{ position: 'absolute', right: big ? -12 : -16, bottom: big ? -16 : -18, color: '#fff', opacity: 0.14 }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: big ? '18px 20px' : '14px 14px' }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontWeight: 800, letterSpacing: '0.01em',
          fontSize: big ? '26px' : '15px', color: '#fff', lineHeight: 1.05, textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{
            marginTop: '4px', fontSize: big ? '13px' : '11px', color: 'rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

export function GameModeGrid({ servers, serverFilter, setServerFilter }) {
  const totalOnline = servers.reduce((sum, s) => sum + s.onlinePlayers, 0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '28px',
      }}
    >
      <Tile
        big
        label="Barcha serverlar"
        sublabel={`Onlayn: ${totalOnline}`}
        icon={LayoutGrid}
        from="#3b82f6"
        to="#0f172a"
        active={serverFilter === 'all'}
        onClick={() => setServerFilter('all')}
      />
      {servers.map((srv) => {
        const style = MODE_STYLES[srv.mode] || FALLBACK_STYLE;
        return (
          <Tile
            key={srv.id}
            label={srv.mode}
            sublabel={`Onlayn: ${srv.onlinePlayers}`}
            icon={style.icon}
            from={style.from}
            to={style.to}
            active={serverFilter === srv.mode}
            onClick={() => setServerFilter(srv.mode)}
          />
        );
      })}
    </div>
  );
}
