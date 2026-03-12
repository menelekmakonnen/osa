import React from 'react';

export function Logo({ className = "w-10 h-10 w-full h-full", wrapperClass = "w-10 h-10" }) {
  return (
    <div className={`flex items-center justify-center text-brand-500 bg-brand-50 rounded-xl overflow-hidden shadow-sm ${wrapperClass}`}>
      <svg 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
        <path d="M100 30C61.3401 30 30 61.3401 30 100C30 138.66 61.3401 170 100 170C138.66 170 170 138.66 170 100C170 61.3401 138.66 30 100 30ZM100 145C75.1472 145 55 124.853 55 100C55 75.1472 75.1472 55 100 55C124.853 55 145 75.1472 145 100C145 124.853 124.853 145 100 145Z" fill="currentColor" />
        <circle cx="100" cy="100" r="28" fill="currentColor" opacity="0.8" />
      </svg>
    </div>
  );
}
