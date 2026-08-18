import React, { useState } from 'react';
import { Gamepad2, ShoppingBag, Trophy, Gift, ShieldAlert, MessageSquare, Wallet, ChevronDown, User, ShieldCheck, Menu, X } from 'lucide-react';
import { SpartanLogo } from './SpartanLogo';
import { CrossedCSGuns } from './CrossedCSGuns';

export default function Navbar({ activeTab, setActiveTab, totalOnline, onOpenPayme, onOpenSteam, user, isAdmin }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setShowMobileMenu(false);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          {/* Logo & Online Pill */}
          <div className="nav-brand-group">
            <a href="#" className="logo" onClick={(e) => { e.preventDefault(); setActiveTab('servers'); }}>
              <SpartanLogo size={32} className="brand-spartan-logo" />
              <span>Stars<span className="logo-accent">CS</span></span>
            </a>

            <div className="online-pill">
              <span className="pulse-dot"></span>
              <span style={{ color: 'var(--green)', fontWeight: 'bold' }}>{totalOnline}</span>
              <span style={{ color: 'var(--text-muted)' }}>Onlayn</span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="nav-links">
            <button className={`nav-btn ${activeTab === 'servers' ? 'active' : ''}`} onClick={() => setActiveTab('servers')}>
              <Gamepad2 size={15} /> Serverlar
            </button>
            <button className={`nav-btn ${activeTab === 'store' ? 'active' : ''}`} onClick={() => setActiveTab('store')}>
              <ShoppingBag size={15} /> Do'kon
            </button>
            <button className={`nav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={15} /> Reyting
            </button>
            <button className={`nav-btn ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
              <Gift size={15} /> Mukofotlar
            </button>
            <button className={`nav-btn ${activeTab === 'skins' ? 'active' : ''}`} onClick={() => setActiveTab('skins')}>
              <CrossedCSGuns size={16} /> Skinlar
            </button>
            <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <User size={15} /> Profil
            </button>
            {isAdmin && (
              <button className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')} style={{ color: 'var(--red)' }}>
                <ShieldCheck size={15} /> Admin
              </button>
            )}

            {/* More Dropdown Menu */}
            <div className="nav-dropdown-wrapper" onMouseEnter={() => setShowMoreMenu(true)} onMouseLeave={() => setShowMoreMenu(false)}>
              <button className={`nav-btn ${(activeTab === 'bans' || activeTab === 'requests') ? 'active' : ''}`}>
                <ShieldAlert size={15} /> Boshqa <ChevronDown size={13} />
              </button>
              {showMoreMenu && (
                <div className="nav-dropdown-menu">
                  <button className={`dropdown-item ${activeTab === 'bans' ? 'active' : ''}`} onClick={() => setActiveTab('bans')}>
                    <ShieldAlert size={14} /> Blokirovkalar
                  </button>
                  <button className={`dropdown-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
                    <MessageSquare size={14} /> So'rovlar
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Action Buttons */}
          <div className="header-actions">
            {/* Wallet button — desktop + mobile */}
            <button className="btn btn-wallet" onClick={onOpenPayme}>
              <Wallet size={15} />
              <span className="btn-label-desktop">To'ldirish</span>
            </button>

            {/* Steam / User Button */}
            {user ? (
              <button
                className="btn btn-steam"
                style={{ borderColor: 'var(--purple)', background: 'rgba(139, 92, 246, 0.15)' }}
                onClick={() => setActiveTab('profile')}
              >
                <img src={user.avatarUrl} alt={user.displayName} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                <span className="btn-steam-text">{user.displayName}</span>
              </button>
            ) : (
              <button className="btn btn-steam" onClick={onOpenSteam}>
                <svg className="steam-official-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.03 4.524 4.524s-2.03 4.524-4.524 4.524c-.102 0-.201-.009-.302-.014l-4.086 2.923c.005.085.014.17.014.256 0 1.841-1.493 3.334-3.334 3.334-1.507 0-2.775-1.002-3.189-2.385L.43 15.659C1.706 20.5 6.13 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z"/>
                </svg>
                <span className="btn-steam-text">Steam Kirish</span>
              </button>
            )}

            {/* Mobile Hamburger — "Boshqa" menyu uchun (faqat mobilda ko'rinadi) */}
            <button
              id="btn-hamburger-menu"
              className="btn btn-mobile-menu"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menyu"
            >
              {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-down Menu (Boshqa / Admin) */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
            <p className="mobile-menu-heading">Qo'shimcha</p>
            <button className={`mobile-menu-item ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => handleTabClick('rewards')}>
              <Gift size={18} /> Mukofotlar
            </button>
            <button className={`mobile-menu-item ${activeTab === 'bans' ? 'active' : ''}`} onClick={() => handleTabClick('bans')}>
              <ShieldAlert size={18} /> Blokirovkalar
            </button>
            <button className={`mobile-menu-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => handleTabClick('requests')}>
              <MessageSquare size={18} /> So'rovlar
            </button>
            {isAdmin && (
              <button className={`mobile-menu-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => handleTabClick('admin')} style={{ color: 'var(--red)' }}>
                <ShieldCheck size={18} /> Admin Panel
              </button>
            )}
            {!user && (
              <button className="mobile-menu-item" onClick={() => { onOpenSteam(); setShowMobileMenu(false); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.03 4.524 4.524s-2.03 4.524-4.524 4.524c-.102 0-.201-.009-.302-.014l-4.086 2.923c.005.085.014.17.014.256 0 1.841-1.493 3.334-3.334 3.334-1.507 0-2.775-1.002-3.189-2.385L.43 15.659C1.706 20.5 6.13 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z"/>
                </svg>
                Steam Kirish
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
