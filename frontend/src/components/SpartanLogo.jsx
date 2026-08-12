import React from 'react';

export function SpartanLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 800 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 0 10px rgba(126, 34, 206, 0.85))', flexShrink: 0 }}
    >
      {/* Outer Helmet Polygon Base */}
      <path
        d="M400 16 L690 160 L690 460 L630 600 L400 780 L170 600 L110 460 L110 160 Z"
        fill="#6B21A8"
      />
      {/* Helmet Right Shading */}
      <path
        d="M400 16 L690 160 L690 460 L630 600 L400 780 V16 Z"
        fill="#581C87"
      />
      {/* Visor & Eye Cutout */}
      <path
        d="M160 310 L300 520 L370 590 L400 620 L430 590 L500 520 L640 310 L560 480 L400 730 L240 480 Z"
        fill="#FFFFFF"
      />
      {/* Star Scar on Eye */}
      <path
        d="M470 310 L530 330 L600 310 L540 390 L670 450 L570 420 L550 500 L530 420 L430 450 L510 390 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
