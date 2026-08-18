import React from 'react';
import { Gamepad2, ShoppingBag, Trophy, CrosshairIcon, User, ShieldAlert } from 'lucide-react';
import { CrossedCSGuns } from './CrossedCSGuns';

const NAV_ITEMS = [
  { id: 'servers',     label: 'Serverlar', Icon: Gamepad2 },
  { id: 'store',       label: "Do'kon",    Icon: ShoppingBag },
  { id: 'leaderboard', label: 'Reyting',   Icon: Trophy },
  { id: 'skins',       label: 'Skinlar',   Icon: null, isCrossed: true },
  { id: 'profile',     label: 'Profil',    Icon: User },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Asosiy navigatsiya">
      {NAV_ITEMS.map(({ id, label, Icon, isCrossed }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            className={`bottom-nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">
              {isCrossed
                ? <CrossedCSGuns size={22} />
                : <Icon size={22} />
              }
              {isActive && <span className="bottom-nav-active-blob" />}
            </span>
            <span className="bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
