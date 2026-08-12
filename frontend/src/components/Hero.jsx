import React from 'react';
import { Flame, Zap, ShieldCheck } from 'lucide-react';

export default function Hero({ totalOnline }) {
  return (
    <section className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content container">
        <h1 className="hero-title">Stars<span style={{ color: 'var(--span)' }}>CS</span> Gaming Portal</h1>
        <p className="hero-subtitle">O'zbekistondagi eng yirik CS2 serverlar tarmog'i va full-stack platformasi</p>
        <div className="hero-stats">
          <div className="stat-box">
            <div className="stat-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Flame size={20} color="var(--money)" /> {totalOnline}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Onlayn O'yinchilar</div>
          </div>
          <div className="stat-box">
            <div className="stat-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Zap size={20} color="var(--span)" /> 9
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CS2 Serverlar</div>
          </div>
          <div className="stat-box">
            <div className="stat-val" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <ShieldCheck size={20} color="var(--green)" /> 128
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tickrate Fast SRV</div>
          </div>
        </div>
      </div>
    </section>
  );
}
