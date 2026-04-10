import React from 'react';

// ══════════════════════════════════════════════════════════════════════
//  "Quiet Luxury" Navigation Icons for OSA
//  
//  Monochrome line icons. No colored circles, no gradients.
//  Color comes from the parent NavItem:
//    - Default: inherits text-zinc-500
//    - Hover: inherits text-zinc-800 / dark:text-zinc-200
//    - Active: inherits var(--school-primary) — the ONLY color pop
//  
//  Each icon is a clean SVG with consistent 24x24 viewBox.
// ══════════════════════════════════════════════════════════════════════

const I = ({ children, size = 20, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 transition-colors duration-150 ${className}`}
    {...props}
  >
    {children}
  </svg>
);

// Dashboard — 4-square bento grid
export function IconDashboard({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </I>
  );
}

// Newsletter — open newspaper/document
export function IconNewsletter({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <path d="M4 4h16v16H4z" rx="2" />
      <path d="M8 8h8M8 12h5" />
      <path d="M16 12v4H8" strokeDasharray={active ? '0' : '0'} />
    </I>
  );
}

// Fundraising — heart with hand
export function IconFundraising({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <path d="M12 21C12 21 4 14.5 4 9.5C4 6.46 6.46 4 9.5 4C10.96 4 12 5 12 5C12 5 13.04 4 14.5 4C17.54 4 20 6.46 20 9.5C20 14.5 12 21 12 21Z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
    </I>
  );
}

// Events — calendar
export function IconEvents({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4M16 2v4" />
      {active && <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />}
    </I>
  );
}

// Directory — people
export function IconDirectory({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <circle cx="9" cy="7" r="3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d="M3 21v-1a6 6 0 0 1 12 0v1" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M21 21v-.5a4 4 0 0 0-4-4" />
    </I>
  );
}

// Group Board — chat bubbles
export function IconBoard({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <path d="M21 12c0 4.418-4.03 8-9 8-1.6 0-3.1-.37-4.4-1L3 21l1.9-4A7.4 7.4 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.1 : 0} />
      {active && <>
        <circle cx="8" cy="12" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </>}
    </I>
  );
}

// Gallery — image
export function IconGallery({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.3 : 0} />
      <path d="M21 15l-5-5L5 21" />
    </I>
  );
}

// Tech Support — lifebuoy
export function IconSupport({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.1 : 0} />
      <path d="M5.64 5.64l3.53 3.53M14.83 14.83l3.53 3.53M18.36 5.64l-3.53 3.53M9.17 14.83l-3.53 3.53" />
    </I>
  );
}

// Admin — sliders / settings panel
export function IconAdmin({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="1.5" fill={active ? 'currentColor' : 'var(--surface-default, #fff)'} />
      <circle cx="16" cy="12" r="1.5" fill={active ? 'currentColor' : 'var(--surface-default, #fff)'} />
      <circle cx="10" cy="17" r="1.5" fill={active ? 'currentColor' : 'var(--surface-default, #fff)'} />
    </I>
  );
}

// Super Admin — shield with star
export function IconSuperAdmin({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <path d="M12 2l7 4v5c0 5.25-3 8.25-7 10-4-1.75-7-4.75-7-10V6l7-4Z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.1 : 0} />
      <path d="M12 8l1.12 2.27 2.5.37-1.81 1.76.43 2.5L12 13.77l-2.24 1.13.43-2.5L8.38 10.64l2.5-.37L12 8Z" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.25 : 0} />
    </I>
  );
}

// Cockpit — monitor/dashboard
export function IconCockpit({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      {active && <>
        <circle cx="7" cy="10" r="1" fill="currentColor" stroke="none" />
        <path d="M11 9h6M11 12h4" strokeWidth="1.5" />
      </>}
    </I>
  );
}

// Settings — gear
export function IconSettings({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </I>
  );
}

// Logout — door arrow
export function IconLogout({ size, active, ...p }) {
  return (
    <I size={size} strokeWidth={active ? 2.2 : 1.8} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </I>
  );
}
