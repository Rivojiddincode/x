import React from 'react';

export function CrossedCSGuns({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Group 1: AK-47 Assault Rifle (Curved Mag) - Angled Top-Left to Bottom-Right */}
      <g transform="translate(32 32) rotate(45) translate(-32 -32)">
        {/* Barrel & Flash Hider */}
        <rect x="44" y="30" width="16" height="2" />
        <rect x="42" y="29" width="4" height="4" />
        {/* Gas Block & Front Sight */}
        <polygon points="38,26 40,26 40,30 38,30" />
        <rect x="28" y="29" width="14" height="4" />
        {/* Receiver & Magazine (AK curved banana mag) */}
        <rect x="18" y="28" width="10" height="6" />
        <path d="M 22 34 C 20 40 16 44 12 46 L 10 44 C 14 42 17 38 19 34 Z" />
        {/* Pistol Grip */}
        <polygon points="16,34 12,42 15,43 19,34" />
        {/* Stock */}
        <polygon points="4,27 18,28 18,34 6,36" />
      </g>

      {/* Group 2: AWP Sniper Rifle (Scope) - Angled Top-Right to Bottom-Left */}
      <g transform="translate(32 32) rotate(-45) translate(-32 -32)">
        {/* Long Sniper Barrel */}
        <rect x="46" y="30" width="16" height="2" />
        <rect x="44" y="29" width="3" height="4" />
        {/* Sniper Scope (AWP Scope) */}
        <rect x="24" y="24" width="14" height="3" />
        <rect x="22" y="23" width="3" height="5" />
        <rect x="37" y="23" width="3" height="5" />
        <rect x="29" y="27" width="4" height="2" />
        {/* Body & Bolt */}
        <rect x="20" y="29" width="24" height="5" />
        {/* Straight Sniper Mag */}
        <rect x="24" y="34" width="6" height="8" />
        {/* Pistol Grip & Thumbhole Stock */}
        <polygon points="18,34 14,42 17,43 20,34" />
        <polygon points="4,26 20,29 20,34 6,37" />
      </g>
    </svg>
  );
}
