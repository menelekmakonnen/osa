import { useEffect, useRef, useCallback } from 'react';

/**
 * useScrollShadow — Makes card shadows respond to scroll position.
 * Cards closer to the viewport center get stronger shadows; cards near
 * the edges get subdued. Uses IntersectionObserver for performance.
 *
 * Usage: const containerRef = useScrollShadow();
 *        <div ref={containerRef}>...cards with .scroll-shadow-card...</div>
 */
export function useScrollShadow() {
  const containerRef = useRef(null);
  const rafId = useRef(null);

  const updateShadows = useCallback(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll('.scroll-shadow-card');
    if (cards.length === 0) return;

    const vh = window.innerHeight;
    const center = vh / 2;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      // Distance from viewport center, normalized 0-1
      const dist = Math.abs(cardCenter - center) / center;
      // Closer to center = higher opacity (0.3 to 1.0 range)
      const opacity = Math.max(0.15, Math.min(1, 1 - dist * 0.7));
      card.style.setProperty('--scroll-shadow-opacity', opacity.toFixed(2));
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(updateShadows);
    };

    // Run once on mount
    updateShadows();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Also observe DOM mutations for dynamically added cards
    const observer = new MutationObserver(onScroll);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      observer.disconnect();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [updateShadows]);

  return containerRef;
}
