import { useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Ensure browser does not remember and restore previous scroll offset
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const resetScrollToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  const main = document.querySelector('main');
  if (main) main.scrollTop = 0;
  const root = document.getElementById('root');
  if (root) root.scrollTop = 0;
};

/**
 * ScrollToTop Component
 * Resets the scroll position to the very top (0,0) whenever any route/page changes,
 * with multi-stage timers to handle lazy-loaded components and async Suspense rendering.
 */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  // 1. Reset immediately before paint
  useLayoutEffect(() => {
    resetScrollToTop();
  }, [pathname, search]);

  // 2. Multi-tier reset to overcome lazy component mounts and dynamic data tables
  useEffect(() => {
    resetScrollToTop();

    const rafId = requestAnimationFrame(resetScrollToTop);
    const t1 = setTimeout(resetScrollToTop, 40);
    const t2 = setTimeout(resetScrollToTop, 120);
    const t3 = setTimeout(resetScrollToTop, 300);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, search]);

  // 3. Global click interceptor on links to pre-emptively scroll to top
  useEffect(() => {
    const handleLinkClick = (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.getAttribute('href') && !anchor.getAttribute('href').startsWith('#')) {
        resetScrollToTop();
      }
    };

    document.addEventListener('click', handleLinkClick, { passive: true });
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  return null;
};

export default ScrollToTop;
