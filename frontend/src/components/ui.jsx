import React, { useId } from 'react';
import { X, Loader2 } from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   Button Component
   Variants: primary, secondary, ghost, danger, success, gold, outline
   ══════════════════════════════════════════════════════════════════════ */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  ...props 
}) {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-[13px] gap-1.5",
    md: "px-5 py-2.5 text-[14px] gap-2",
    lg: "px-6 py-3 text-[15px] gap-2.5"
  };
  
  const variantStyles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "inline-flex items-center justify-center font-semibold border-[1.5px] border-border-light text-ink-body hover:bg-surface-hover hover:border-ink-muted/20 active:scale-[0.92] transition-all duration-200 ease-spring cursor-pointer",
    danger: "inline-flex items-center justify-center font-semibold bg-red-500 text-white hover:bg-red-600 active:scale-[0.92] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-spring border-none cursor-pointer shadow-sm rounded-social",
    success: "inline-flex items-center justify-center font-semibold bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.92] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-spring border-none cursor-pointer shadow-sm rounded-social",
    gold: "inline-flex items-center justify-center font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 active:scale-[0.92] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-spring border-none cursor-pointer shadow-sm rounded-social",
  };

  const roundedStyles = {
    sm: "rounded-[12px]",
    md: "rounded-social",
    lg: "rounded-2xl",
  };

  const disabledStyle = "opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <button
      className={`${sizeStyles[size]} ${variantStyles[variant]} ${roundedStyles[size]} ${disabled || loading ? disabledStyle : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Badge / Pill
   ══════════════════════════════════════════════════════════════════════ */
export function Badge({ children, colorHex, textHex, className = '' }) {
  const bg = colorHex || 'var(--surface-muted)';
  const text = textHex || 'var(--ink-title)';
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${className}`}
      style={{ backgroundColor: bg, color: text }}
    >
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Cheque Chip (Diagonal Stripe Pattern)
   ══════════════════════════════════════════════════════════════════════ */
export function ChequeChip({ colorHex, text, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-surface-muted rounded-full text-[12px] font-semibold text-ink-title border border-border-light ${className}`}>
      <div 
        className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1 ring-black/5" 
        style={{ backgroundColor: colorHex }}
        title="Cheque Colour"
      />
      <span className="truncate">{text}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   School Pill
   ══════════════════════════════════════════════════════════════════════ */
export function SchoolPill({ shortCode, brandColorHex, className = '' }) {
  return (
    <span 
      className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white rounded-md uppercase tracking-wide shadow-sm ${className}`}
      style={{ backgroundColor: brandColorHex || 'var(--school-primary)' }}
    >
      {shortCode}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Card
   ══════════════════════════════════════════════════════════════════════ */
export function Card({ children, hoverable = false, glass = false, className = '', ...props }) {
  const baseClass = glass ? 'glass-card' : 'social-card';
  return (
    <div 
      className={`${baseClass} p-4 ${hoverable ? 'hoverable cursor-pointer' : ''} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Modal — with backdrop blur, slide-up animation
   ══════════════════════════════════════════════════════════════════════ */
export function Modal({ isOpen, onClose, title, children, wide = false, noPadding = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div 
        className={`bg-surface-default w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'} sm:rounded-[32px] rounded-t-[32px] shadow-social-dropdown flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10 overflow-hidden animate-spring-pop border border-border-light`}
      >
        <div className="px-5 py-4 border-b border-border-light flex justify-between items-center bg-surface-default sticky top-0 z-20">
          <h2 className="text-lg font-bold text-ink-title m-0 tracking-tight">{title}</h2>
          <button 
            className="icon-btn w-8 h-8 !p-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" 
            onClick={onClose} 
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-5'} overflow-y-auto custom-scrollbar relative`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Input Fields
   ══════════════════════════════════════════════════════════════════════ */
export const Input = React.forwardRef(function Input({ label, error, className = '', inputClassName = '', id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
        <div className={`mb-3 ${className}`}>
            {label && (
              <label htmlFor={inputId} className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">
                {label}
              </label>
            )}
            <input ref={ref} id={inputId} className={`social-input ${inputClassName}`} {...props} />
            {error && <span className="block text-red-500 text-[12px] mt-1.5 ml-0.5 font-medium">{error}</span>}
        </div>
    );
});

export const Textarea = React.forwardRef(function Textarea({ label, error, className = '', id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
        <div className={`mb-3 ${className}`}>
            {label && (
              <label htmlFor={inputId} className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">
                {label}
              </label>
            )}
            <textarea ref={ref} id={inputId} className="social-textarea flex-1 min-h-[100px]" {...props} />
            {error && <span className="block text-red-500 text-[12px] mt-1.5 ml-0.5 font-medium">{error}</span>}
        </div>
    );
});

export function Select({ label, options, error, className = '', id, ...props }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
        <div className={`mb-3 ${className}`}>
            {label && (
              <label htmlFor={inputId} className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">
                {label}
              </label>
            )}
            <select id={inputId} className="osa-select" {...props}>
                {options.map((opt, i) => (
                    <option key={i} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <span className="block text-red-500 text-[12px] mt-1.5 ml-0.5 font-medium">{error}</span>}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════
   Skeleton Loader — shimmer effect
   ══════════════════════════════════════════════════════════════════════ */
export function Skeleton({ className = '', lines = 1, circle = false }) {
  if (circle) {
    return <div className={`skeleton rounded-full ${className}`} />;
  }
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton h-4 rounded-full" 
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }} 
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`social-card p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton circle className="w-10 h-10" />
        <div className="flex-1">
          <Skeleton className="w-32 h-4 mb-2" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <Skeleton lines={3} className="mb-3" />
      <Skeleton className="w-full h-8 mt-2" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Toggle Switch
   ══════════════════════════════════════════════════════════════════════ */
export function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {label && <p className="font-semibold text-ink-title text-[14px]">{label}</p>}
        {description && <p className="text-[12px] text-ink-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
          checked ? 'bg-school' : 'bg-ink-muted/30'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
