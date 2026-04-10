import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';

/**
 * Premium Avatar Component for OSA — v3
 * 
 * When no photo: gradient school colors circle with bold white initials (up to 3 chars).
 * Photo mode: image with a subtle ring.
 * Hover: vivid pulse animation.
 * Long-hover (800ms): tooltip popup with public profile info.
 *
 * Sizes: xs (24px), sm (32px), md (40px), lg (48px), xl (64px), 2xl (80px)
 */

const SIZES = {
  xs:  { box: 24, text: 8,   ring: 1.5 },
  sm:  { box: 32, text: 10,  ring: 2 },
  md:  { box: 40, text: 12,  ring: 2.5 },
  lg:  { box: 48, text: 14,  ring: 2.5 },
  xl:  { box: 64, text: 18,  ring: 3 },
  '2xl': { box: 80, text: 22, ring: 3.5 },
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return (parts[0][0] + parts[1][0] + parts[2][0]).toUpperCase();
  if (parts.length === 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

// Simple profile info cache so we don't re-fetch on every hover
const _profileCache = new Map();

export function Avatar({ src, name = '', size = 'md', className = '', style = {}, userId, showTooltip = false }) {
  const s = SIZES[size] || SIZES.md;
  const initials = getInitials(name);
  const hasPhoto = src && src.length > 0;
  const [hovered, setHovered] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const longHoverTimer = useRef(null);
  const tooltipRef = useRef(null);

  // Long-hover: load profile tooltip
  const handleMouseEnter = () => {
    setHovered(true);
    if (!showTooltip || !userId) return;

    longHoverTimer.current = setTimeout(async () => {
      // Check cache first
      if (_profileCache.has(userId)) {
        setTooltipData(_profileCache.get(userId));
        setTooltipVisible(true);
        return;
      }
      try {
        const profile = await api.getProfile(userId);
        if (profile) {
          _profileCache.set(userId, profile);
          setTooltipData(profile);
          setTooltipVisible(true);
        }
      } catch (e) { /* silently fail */ }
    }, 800);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTooltipVisible(false);
    if (longHoverTimer.current) {
      clearTimeout(longHoverTimer.current);
      longHoverTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (longHoverTimer.current) clearTimeout(longHoverTimer.current);
    };
  }, []);

  // Font size scales based on how many initials we have
  const fontSize = initials.length >= 3 ? s.text * 0.8 : s.text;

  return (
    <div className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center font-extrabold select-none transition-all duration-300 ${hovered ? 'scale-110 shadow-lg' : ''} ${className}`}
        style={{
          width: s.box,
          height: s.box,
          boxShadow: hovered
            ? `0 0 0 ${s.ring}px var(--school-primary, #B067A1), 0 4px 16px rgba(0,0,0,0.2)`
            : `0 0 0 ${s.ring}px var(--school-primary, #B067A1)`,
          background: hasPhoto
            ? 'transparent'
            : 'linear-gradient(135deg, var(--school-secondary, #F5C518), var(--school-primary, #B067A1))',
          color: hasPhoto ? 'transparent' : '#FFFFFF',
          cursor: showTooltip ? 'pointer' : 'default',
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
          <span style={{ fontSize, lineHeight: 1, letterSpacing: initials.length >= 3 ? '-0.5px' : '0' }}>{initials}</span>
        )}
      </div>

      {/* Tooltip popup on long hover */}
      {tooltipVisible && tooltipData && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-slide-up"
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-surface-elevated border border-border-light rounded-2xl shadow-social-dropdown px-4 py-3 min-w-[180px] max-w-[240px] text-center">
            <p className="text-[13px] font-bold text-ink-title truncate">{tooltipData.name || name}</p>
            {tooltipData.year_group_nickname && (
              <p className="text-[11px] text-ink-muted mt-0.5">{tooltipData.year_group_nickname}</p>
            )}
            {tooltipData.role && (
              <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--school-tint)', color: 'var(--school-primary)' }}>
                {tooltipData.role}
              </span>
            )}
            {tooltipData.bio && (
              <p className="text-[11px] text-ink-body mt-2 line-clamp-2 leading-relaxed">{tooltipData.bio}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
