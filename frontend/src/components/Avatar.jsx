import React from 'react';

/**
 * Premium Avatar Component for OSA
 * 
 * When no photo: shows first initial inside a circle filled with school's primary color,
 * surrounded by a ring in the school's secondary color.
 * When photo exists: shows photo with a secondary-color ring.
 * 
 * Sizes: xs (24px), sm (32px), md (40px), lg (48px), xl (64px), 2xl (80px)
 */

const SIZES = {
  xs:  { box: 24, text: 'text-[10px]', ring: 2 },
  sm:  { box: 32, text: 'text-xs',     ring: 2 },
  md:  { box: 40, text: 'text-sm',     ring: 2.5 },
  lg:  { box: 48, text: 'text-base',   ring: 3 },
  xl:  { box: 64, text: 'text-xl',     ring: 3 },
  '2xl': { box: 80, text: 'text-2xl',  ring: 3.5 },
};

export function Avatar({ src, name = '', size = 'md', className = '', style = {} }) {
  const s = SIZES[size] || SIZES.md;
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const hasPhoto = src && src.length > 0;

  return (
    <div
      className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold select-none ${className}`}
      style={{
        width: s.box,
        height: s.box,
        boxShadow: `0 0 0 ${s.ring}px var(--school-primary, #B067A1)`,
        backgroundColor: hasPhoto ? 'transparent' : 'var(--school-secondary, #F5C518)',
        color: hasPhoto ? 'transparent' : 'var(--school-on-secondary, #FFF)',
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
        <span className={`${s.text} leading-none`}>{initial}</span>
      )}
    </div>
  );
}
