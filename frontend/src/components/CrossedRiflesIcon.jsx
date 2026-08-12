import React from 'react';

export function CrossedRiflesIcon({ size = 15, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* Rifle 1: Top-Right to Bottom-Left */}
      <path d="M21.7 2.3l-1.4-1.4-3.5 1.4-2.8 2.8 1.4 1.4-1.4 1.4-9.2 9.2-2.1-.7-2.1 2.1 1.4 1.4-2.1 2.1 2.8 2.8 2.1-2.1 1.4 1.4 2.1-2.1-.7-2.1 9.2-9.2 1.4-1.4 1.4 1.4 2.8-2.8 1.4-3.5z" />
      {/* Rifle 2: Top-Left to Bottom-Right */}
      <path d="M2.3 2.3l1.4-1.4 3.5 1.4 2.8 2.8-1.4 1.4 1.4 1.4 9.2 9.2 2.1-.7 2.1 2.1-1.4 1.4 2.1 2.1-2.8 2.8-2.1-2.1-1.4 1.4-2.1-2.1.7-2.1-9.2-9.2-1.4-1.4-1.4 1.4-2.8-2.8-1.4-3.5z" />
    </svg>
  );
}
