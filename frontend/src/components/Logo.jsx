import React, { useEffect, useRef } from 'react';
import { authState } from '../api/client';

/**
 * OSA Logo / School Crest
 * Uses school primary & secondary colors from the theme engine.
 * Falls back to the school_logo image URL if available.
 */
export function Logo({ className = "w-10 h-10", wrapperClass = "w-10 h-10", noText = false }) {
  const user = authState.getUser();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const timer = setTimeout(() => {
      if (!svgRef.current) return;
      
      const root = document.documentElement;
      const primaryColor = getComputedStyle(root).getPropertyValue('--school-primary').trim() || '#0F172A';
      const secondaryColor = getComputedStyle(root).getPropertyValue('--school-secondary').trim() || '#3B82F6';

      const svgStr = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
           <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 C100 190, 185 150, 185 100 L185 30 Z" fill="${secondaryColor}" fill-opacity="0.9" />
           <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 L100 10 Z" fill="${primaryColor}" />
           <path d="M100 10 L185 30 L185 100 C185 150, 100 190, 100 190 L100 10 Z" fill="${secondaryColor}" />
           <circle cx="100" cy="70" r="16" fill="white"/>
           <path d="M70 115 h60 M70 145 h60" stroke="white" stroke-width="10" stroke-linecap="round"/>
        </svg>`;

      try {
        const dataUri = "data:image/svg+xml;base64," + btoa(svgStr);
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = dataUri;
      } catch (e) {
        console.error("Failed to inject favicon", e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`flex items-center justify-center ${wrapperClass}`}>
      <svg 
        ref={svgRef}
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
         <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 C100 190, 185 150, 185 100 L185 30 Z" fill="var(--school-secondary, #3B82F6)" fillOpacity="0.9" />
         <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 L100 10 Z" fill="var(--school-primary, #0F172A)" />
         <path d="M100 10 L185 30 L185 100 C185 150, 100 190, 100 190 L100 10 Z" fill="var(--school-secondary, #3B82F6)" />
         <circle cx="100" cy="70" r="16" fill="white"/>
         <path d="M70 115 h60 M70 145 h60" stroke="white" strokeWidth="10" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
