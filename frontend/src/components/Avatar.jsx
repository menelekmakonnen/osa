import React, { useState, useRef, useCallback } from 'react';

/**
 * Premium Avatar Component for OSA — v2.0
 * 
 * When no photo: shows initials (up to 3 letters) inside a circle with a
 * conic-gradient ring using school primary → secondary colors.
 * Hover: ring rotates + scale pulse.
 * Long-hover (800ms): shows floating tooltip with public user info.
 *
 * Sizes: xs (24px), sm (32px), md (40px), lg (48px), xl (64px), 2xl (80px)
 */

const SIZES = {
  xs:  { box: 24, text: 9,   ring: 2,   gap: 2 },
  sm:  { box: 32, text: 11,  ring: 2,   gap: 2 },
  md:  { box: 40, text: 13,  ring: 2.5, gap: 2 },
  lg:  { box: 48, text: 15,  ring: 3,   gap: 3 },
  xl:  { box: 64, text: 20,  ring: 3,   gap: 3 },
  '2xl': { box: 80, text: 24, ring: 3.5, gap: 4 },
};

/** Extract up to 3 initials from a full name */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  if (parts.length === 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  // 3+ names: first, middle, last
  return (parts[0].charAt(0) + parts[1].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ 
  src, 
  name = '', 
  size = 'md', 
  className = '', 
  style = {},
  tooltipInfo = null,  // { role, yearGroup, email } — shown on long hover
  showTooltip = false, // enable long-hover tooltip
}) {
  const s = SIZES[size] || SIZES.md;
  const initials = getInitials(name);
  const hasPhoto = src && src.length > 0;
  const [hovered, setHovered] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const tipTimer = useRef(null);

  const onEnter = useCallback(() => {
    setHovered(true);
    if (showTooltip && tooltipInfo) {
      tipTimer.current = setTimeout(() => setTipVisible(true), 800);
    }
  }, [showTooltip, tooltipInfo]);

  const onLeave = useCallback(() => {
    setHovered(false);
    setTipVisible(false);
    if (tipTimer.current) clearTimeout(tipTimer.current);
  }, []);

  // Outer ring with conic gradient
  const outerSize = s.box + s.gap * 2 + s.ring * 2;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ width: outerSize, height: outerSize }}
    >
      {/* Gradient ring */}
      <div
        className="absolute inset-0 rounded-full avatar-gradient-ring"
        style={{
          background: `conic-gradient(from 0deg, var(--school-primary, #B067A1), var(--school-secondary, #F5C518), var(--school-primary, #B067A1))`,
          padding: s.ring,
          animationPlayState: hovered ? 'running' : 'paused',
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{ background: 'var(--surface-default, #fff)' }}
        />
      </div>

      {/* Inner circle */}
      <div
        className={`absolute rounded-full overflow-hidden flex items-center justify-center font-extrabold select-none transition-transform duration-300 ${hovered ? 'scale-105' : 'scale-100'}`}
        style={{
          top: s.ring + s.gap,
          left: s.ring + s.gap,
          width: s.box,
          height: s.box,
          backgroundColor: hasPhoto ? 'transparent' : 'var(--school-secondary, #F5C518)',
          color: hasPhoto ? 'transparent' : '#FFFFFF',
          textShadow: hasPhoto ? 'none' : '0 1px 2px rgba(0,0,0,0.15)',
          ...style,
        }}
      >
        {hasPhoto ? (
          <img
            src={src}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <span style={{ fontSize: s.text, lineHeight: 1, letterSpacing: initials.length > 2 ? '-0.03em' : '0.01em' }}>
            {initials}
          </span>
        )}
      </div>

      {/* Long-hover tooltip */}
      {tipVisible && tooltipInfo && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 animate-slide-down pointer-events-none">
          <div className="bg-surface-elevated border border-border-light rounded-2xl shadow-social-dropdown px-4 py-3 min-w-[180px] text-center whitespace-nowrap">
            <p className="text-[13px] font-bold text-ink-title leading-tight">{name}</p>
            {tooltipInfo.role && (
              <p className="text-[11px] font-medium text-ink-muted mt-0.5">{tooltipInfo.role}</p>
            )}
            {tooltipInfo.yearGroup && (
              <p className="text-[10px] text-ink-muted mt-0.5">{tooltipInfo.yearGroup}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
