import React from 'react';
import { Trophy, Award } from 'lucide-react';

export function LeaderboardView({ leaderboard }) {
  return (
    <div className="table-card">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>O'yinchi</th>
            <th>O'ldirishlar</th>
            <th>O'limlar</th>
            <th>K/D</th>
            <th>Headshot %</th>
            <th>Win %</th>
            <th>Badge</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map(p => (
            <tr key={p.rank}>
              <td>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                  {p.rank === 1 && <Trophy size={16} color="#ffd700" />}
                  {p.rank === 2 && <Award size={16} color="#c0c0c0" />}
                  {p.rank === 3 && <Award size={16} color="#cd7f32" />}
                  #{p.rank}
                </span>
              </td>
              <td><strong>{p.name}</strong></td>
              <td style={{ color: 'var(--green)' }}>{p.kills.toLocaleString()}</td>
              <td style={{ color: 'var(--text-muted)' }}>{p.deaths.toLocaleString()}</td>
              <td style={{ color: 'var(--money)' }}>{p.kd}</td>
              <td>{p.headshots}</td>
              <td>{p.winRate}</td>
              <td>
                <span style={{ background: 'rgba(90,128,242,0.2)', color: 'var(--span)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                  {p.rankBadge}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
