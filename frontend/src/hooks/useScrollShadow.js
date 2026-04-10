import { useEffect, useRef } from 'react';

/**
 * useScrollShadow — Scroll-responsive shadow system
 *
 * Observes all .social-card elements in the viewport and dynamically
 * adjusts their --scroll-shadow CSS property (0 to 1) based on how
 * centered they are in the viewport.
 *
 * Cards near the center of the viewport get brighter/stronger shadows (1),
 * cards near the edges get dimmer shadows (0).
 *
 * Uses IntersectionObserver for efficiency — no scroll event listeners.
 */
export function useScrollShadow() {
  const observerRef = useRef(null);

  useEffect(() => {
    // Create an IntersectionObserver with multiple thresholds for granularity
    const thresholds = Array.from({ length: 11 }, (_, i) => i * 0.1);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            entry.target.style.setProperty('--scroll-shadow', '0.1');
            return;
          }
          // Map intersection ratio to shadow intensity
          // Higher ratio = more visible = brighter shadow
          const ratio = entry.intersectionRatio;
          // Add a boost when element is centered in viewport
          const rect = entry.boundingClientRect;
          const viewportCenter = window.innerHeight / 2;
          const elementCenter = rect.top + rect.height / 2;
          const distFromCenter = Math.abs(viewportCenter - elementCenter);
          const maxDist = window.innerHeight / 2;
          const centerBoost = 1 - Math.min(distFromCenter / maxDist, 1);

          // Combine: 60% from ratio, 40% from center proximity
          const intensity = Math.min(1, ratio * 0.6 + centerBoost * 0.4);
          entry.target.style.setProperty('--scroll-shadow', intensity.toFixed(2));
        });
      },
      { threshold: thresholds }
    );

    // Observe all social-card elements
    const observe = () => {
      const cards = document.querySelectorAll('.social-card, .scroll-shadow-card');
      cards.forEach((card) => {
        observerRef.current.observe(card);
      });
    };

    // Initial observation + re-observe on DOM changes
    observe();
    const mutationObserver = new MutationObserver(() => {
      // Disconnect existing observations and re-observe
      if (observerRef.current) {
        observerRef.current.disconnect();
        observe();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
