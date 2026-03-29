import React, { useEffect, useRef } from 'react';
import { authState } from '../api/client';

export function Logo({ className = "w-10 h-10 w-full h-full", wrapperClass = "w-10 h-10" }) {
  const user = authState.getUser();
  const userColor = user?.colour || user?.cheque_colour || null;
  const svgRef = useRef(null);

  useEffect(() => {
    // Generate and inject dynamic Favicon matching the Crest's colors
    if (!svgRef.current) return;
    
    // Give browser a moment to apply computed CSS
    setTimeout(() => {
        if (!svgRef.current) return;
        const styles = getComputedStyle(svgRef.current);
        const primaryColor = userColor || styles.color || "#1e293b"; 
        const secondaryColor = userColor || styles.getPropertyValue('--school-secondary').trim() || "#3b82f6";

        const svgStr = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
             <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 C100 190, 185 150, 185 100 L185 30 Z" fill="${primaryColor}" fill-opacity="0.9" />
             <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 L100 10 Z" fill="${secondaryColor}" />
             <path d="M100 10 L185 30 L185 100 C185 150, 100 190, 100 190 L100 10 Z" fill="${primaryColor}" />
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
    }, 50);
  }, []);

  return (
    <div className={`flex items-center justify-center text-brand-500 ${wrapperClass}`}>
      <svg 
        ref={svgRef}
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
         <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 C100 190, 185 150, 185 100 L185 30 Z" fill={userColor || "currentColor"} fillOpacity="0.9" />
         <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 L100 10 Z" fill={userColor || "var(--school-secondary, #3b82f6)"} />
         <path d="M100 10 L185 30 L185 100 C185 150, 100 190, 100 190 L100 10 Z" fill={userColor || "currentColor"} />
         <circle cx="100" cy="70" r="16" fill="white"/>
         <path d="M70 115 h60 M70 145 h60" stroke="white" strokeWidth="10" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
