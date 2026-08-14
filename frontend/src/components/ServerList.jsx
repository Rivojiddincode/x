import React from 'react';
import { Play, Copy, Wifi } from 'lucide-react';
import { GameModeGrid } from './GameModeGrid';

export function ServerCard({ srv, onToast }) {
  const percent = Math.min(100, Math.round((srv.onlinePlayers / srv.maxPlayers) * 100));

  return (
    <div className="card">
      <div>
        <span style={{ fontSize: '11px', background: 'rgba(90,128,242,0.2)', color: 'var(--span)', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
          {srv.badge}
        </span>
        <h3 className="card-title" style={{ marginTop: '10px' }}>{srv.name}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          <span>Rejim: <strong>{srv.mode}</strong></span>
          <span>Map: <strong>{srv.map}</strong></span>
          <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Wifi size={12} /> {srv.ping}ms
          </span>
        </div>
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Onlayn:</span>
            <span><strong>{srv.onlinePlayers}</strong> / {srv.maxPlayers}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${percent}%` }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
        <button className="btn" style={{ flex: 1, background: 'var(--span)', color: '#fff' }} onClick={() => onToast(`Connecting to steam://connect/${srv.ip}`)}>
          <Play size={14} /> Ulanish
        </button>
        <button className="btn btn-steam" onClick={() => { navigator.clipboard.writeText(srv.ip); onToast('Server IP kopiyalandi!'); }}>
          <Copy size={14} /> IP Copy
        </button>
      </div>
    </div>
  );
}

export function ServerList({ servers, serverFilter, setServerFilter, onToast }) {
  const filtered = serverFilter === 'all' ? servers : servers.filter(s => s.mode === serverFilter);

  return (
    <div>
      <GameModeGrid servers={servers} serverFilter={serverFilter} setServerFilter={setServerFilter} />

      <div className="grid">
        {filtered.map(srv => (
          <ServerCard key={srv.id} srv={srv} onToast={onToast} />
        ))}
      </div>
    </div>
  );
}
