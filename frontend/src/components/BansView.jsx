import React from 'react';
import { ShieldAlert, Send } from 'lucide-react';

export function BansView({ bans }) {
  return (
    <div className="table-card">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>O'yinchi</th>
            <th>Steam ID</th>
            <th>Sana</th>
            <th>Admin</th>
            <th>Sabab</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bans.map(b => (
            <tr key={b.id}>
              <td>#{b.id}</td>
              <td><strong>{b.name}</strong></td>
              <td><code>{b.steamId}</code></td>
              <td>{b.date}</td>
              <td>{b.admin}</td>
              <td style={{ color: 'var(--red)' }}>{b.reason}</td>
              <td>
                <span style={{ color: b.status === 'Active' ? 'var(--red)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={14} /> {b.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RequestsView({ reqForm, setReqForm, onSubmit }) {
  return (
    <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h3 className="card-title">Murojaat Yuborish</h3>
      <form onSubmit={onSubmit} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ismingiz</label>
          <input className="form-input" value={reqForm.name} onChange={e => setReqForm({...reqForm, name: e.target.value})} required />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Telegram Username</label>
          <input className="form-input" value={reqForm.telegram} onChange={e => setReqForm({...reqForm, telegram: e.target.value})} required />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Murojaat Matni</label>
          <textarea className="form-input" rows="4" value={reqForm.message} onChange={e => setReqForm({...reqForm, message: e.target.value})} required />
        </div>
        <button type="submit" className="btn btn-wallet">
          <Send size={16} /> Yuborish
        </button>
      </form>
    </div>
  );
}
