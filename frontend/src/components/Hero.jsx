import React from 'react';
import { Flame, Server, Gauge } from 'lucide-react';

export default function Hero({ totalOnline, serverCount = 9 }) {
  return (
    <section className="hero">
      {/* Ambient backdrop: soft glow + tactical radar rings + faint grid */}
      <div className="hero-backdrop" aria-hidden="true">
        <div className="hero-glow" />
        <div className="hero-grid" />
        <div className="hero-radar">
          <span className="radar-ring r1" />
          <span className="radar-ring r2" />
          <span className="radar-ring r3" />
          <span className="radar-sweep" />
          <span className="radar-blip b1" />
          <span className="radar-blip b2" />
          <span className="radar-blip b3" />
        </div>
      </div>

      <div className="hero-content container">
        <div className="hero-eyebrow">
          <span className="live-dot" /> LIVE &middot; O'ZBEKISTON CS2 TARMOG'I
        </div>

        <h1 className="hero-title">
          Stars<span className="hero-title-accent">CS</span> Gaming Portal
        </h1>
        <p className="hero-subtitle">O'zbekistondagi eng yirik CS2 serverlar tarmog'i va full-stack platformasi</p>

        <div className="hero-stats">
          <div className="stat-box stat-box-flame">
            <Flame size={22} className="stat-icon" />
            <div>
              <div className="stat-val">{totalOnline}</div>
              <div className="stat-label">Onlayn O'yinchilar</div>
            </div>
          </div>
          <div className="stat-box stat-box-server">
            <Server size={22} className="stat-icon" />
            <div>
              <div className="stat-val">{serverCount}</div>
              <div className="stat-label">CS2 Serverlar</div>
            </div>
          </div>
          <div className="stat-box stat-box-tick">
            <Gauge size={22} className="stat-icon" />
            <div>
              <div className="stat-val">128</div>
              <div className="stat-label">Tickrate Fast SRV</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
