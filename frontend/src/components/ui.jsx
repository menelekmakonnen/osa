import React, { useId } from 'react';
import { X } from 'lucide-react';

/* 
  Button Component
  Variants: primary, secondary (outline), ghost, danger, success
*/
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  ...props 
}) {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  
  const variantStyles = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "inline-flex items-center justify-center font-bold px-4 py-2 rounded-md bg-danger text-white hover:bg-red-600 active:scale-95 transition-all duration-200 border-none",
    success: "inline-flex items-center justify-center font-bold px-4 py-2 rounded-md bg-success text-white hover:bg-green-600 active:scale-95 transition-all duration-200 border-none",
    gold: "inline-flex items-center justify-center font-bold px-4 py-2 rounded-md bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all duration-200 border-none"
  };

  const disabledStyle = "opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <button
      className={`${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? disabledStyle : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/* 
  Badge / Pill Component
*/
export function Badge({ children, colorHex, textHex = '#050505', className = '' }) {
  // If no explicit color given, default to light gray bg
  const bg = colorHex || '#E4E6EB';
  
  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-semibold ${className}`}
      style={{ backgroundColor: bg, color: textHex }}
    >
      {children}
    </span>
  );
}

/* 
  Cheque Chip Component (Diagonal Stripe Pattern)
*/
export function ChequeChip({ colorHex, text, className = '' }) {
  // Minimal social version
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-muted rounded-pill text-xs font-semibold text-ink-title ${className}`}>
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: colorHex }}
        title="Cheque Colour Indicator"
      />
      <span>{text}</span>
    </div>
  );
}

/* 
  School Pill
*/
export function SchoolPill({ shortCode, brandColorHex = '#22c55e', className = '' }) {
  return (
    <span 
      className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold text-white rounded bg-brand-500 uppercase tracking-wide ${className}`}
      style={{ backgroundColor: brandColorHex }}
    >
      {shortCode}
    </span>
  );
}

/* 
  Card Component
*/
export function Card({ children, hoverable = false, className = '', ...props }) {
  return (
    <div className={`social-card p-4 ${hoverable ? 'hover:bg-surface-hover cursor-pointer transition-colors duration-200' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

/* 
  Modal Component
*/
export function Modal({ isOpen, onClose, title, children, wide = false, noPadding = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-transparent" onClick={onClose}></div>
      <div 
        className={`bg-surface-default w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-[12px] shadow-[0_12px_28px_0_rgba(0,0,0,0.2),0_2px_4px_0_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.5)] flex flex-col max-h-[90vh] z-10 overflow-hidden`}
      >
        <div className="px-4 py-3 border-b border-border-light flex justify-between items-center bg-surface-default sticky top-0 z-20">
          <h2 className="text-xl font-bold text-ink-title m-0">{title}</h2>
          <button className="icon-btn bg-surface-muted hover:bg-border-light rounded-full p-1" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-4'} overflow-y-auto custom-scrollbar relative`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/*
  Input Fields
*/
export function Input({ label, error, className = '', id, ...props }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
        <div className={`mb-3 ${className}`}>
            {label && <label htmlFor={inputId} className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">{label}</label>}
            <input id={inputId} className="social-input" {...props} />
            {error && <span className="block text-danger text-xs mt-1 ml-1 font-medium">{error}</span>}
        </div>
    )
}

export function Textarea({ label, error, className = '', id, ...props }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
        <div className={`mb-3 ${className}`}>
            {label && <label htmlFor={inputId} className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">{label}</label>}
            <textarea id={inputId} className="social-textarea flex-1 min-h-[100px]" {...props} />
            {error && <span className="block text-danger text-xs mt-1 ml-1 font-medium">{error}</span>}
        </div>
    )
}

export function Select({ label, options, error, className = '', id, ...props }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    return (
        <div className={`mb-3 ${className}`}>
            {label && <label htmlFor={inputId} className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">{label}</label>}
            <select id={inputId} className="social-input appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%208l5%205%205-5%22%20stroke%3D%22%2365676B%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center]" {...props}>
                {options.map((opt, i) => (
                    <option key={i} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <span className="block text-danger text-xs mt-1 ml-1 font-medium">{error}</span>}
        </div>
    )
}
