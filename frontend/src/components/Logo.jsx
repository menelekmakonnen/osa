import React, { useEffect, useRef } from 'react';

export function Logo({ className = "w-10 h-10 w-full h-full", wrapperClass = "w-10 h-10" }) {
  const svgRef = useRef(null);

  useEffect(() => {
    // Generate and inject dynamic Favicon matching the Crest's colors
    if (!svgRef.current) return;
    
    // Give browser a moment to apply computed CSS
    setTimeout(() => {
        if (!svgRef.current) return;
        const styles = getComputedStyle(svgRef.current);
        const primaryColor = styles.color || "#1e293b"; 
        const secondaryColor = styles.getPropertyValue('--school-secondary').trim() || "#3b82f6";

        const svgStr = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
             <path d="M100 15 C100 15, 25 35, 25 100 C25 165, 100 195, 100 195 C100 195, 175 165, 175 100 C175 35, 100 15, 100 15 Z" fill="${primaryColor}" fill-opacity="0.9" />
             <path d="M100 15 C100 15, 25 35, 25 100 C25 165, 100 195, 100 195 L100 190 L100 15 Z" fill="${secondaryColor}" />
             <path d="M100 15 L100 195 C100 195, 175 165, 175 100 C175 35, 100 15, 100 15 Z" fill="${primaryColor}" />
             <circle cx="100" cy="65" r="18" fill="white"/>
             <path d="M65 110 h70 M65 145 h70" stroke="white" stroke-width="10" stroke-linecap="round"/>
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
    <div className={`flex items-center justify-center text-brand-500 bg-brand-50 rounded-xl overflow-hidden shadow-sm ${wrapperClass}`}>
      <svg 
        ref={svgRef}
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
      >
         <path d="M100 15 C100 15, 25 35, 25 100 C25 165, 100 195, 100 195 C100 195, 175 165, 175 100 C175 35, 100 15, 100 15 Z" fill="currentColor" fillOpacity="0.9" />
         <path d="M100 15 C100 15, 25 35, 25 100 C25 165, 100 195, 100 195 L100 190 L100 15 Z" fill="var(--school-secondary, #3b82f6)" />
         <path d="M100 15 L100 195 C100 195, 175 165, 175 100 C175 35, 100 15, 100 15 Z" fill="currentColor" />
         <circle cx="100" cy="65" r="18" fill="white"/>
         <path d="M65 110 h70 M65 145 h70" stroke="white" strokeWidth="10" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
