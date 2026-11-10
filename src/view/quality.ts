/** Central GPU budget.  Keeps the 1920×1080 composition, but caps backing-store
 * resolution on memory-constrained mobile WebKit independently of orientation. */
export function renderPixelRatio() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const mobile = matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return Math.min(dpr, mobile ? 1.25 : 2);
}

/** Coalesce resize/orientation/visualViewport bursts into one allocation pass. */
export function coalescedResize(fn: () => void) {
  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; fn(); }); };
  addEventListener('resize', request, { passive: true });
  addEventListener('orientationchange', request, { passive: true });
  visualViewport?.addEventListener('resize', request, { passive: true });
  visualViewport?.addEventListener('scroll', request, { passive: true });
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', request); removeEventListener('orientationchange', request); visualViewport?.removeEventListener('resize', request); visualViewport?.removeEventListener('scroll', request); };
}
