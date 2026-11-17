/**
 * Jumps to the element named by a URL hash ("#reduce"). Instant, not smooth: after a
 * page load or a search jump the reader wants to be there, not watch the page scroll.
 */
export function scrollToHash(hash: string) {
  if (!hash || hash === '#') return;
  const el = document.getElementById(decodeURIComponent(hash.slice(1)));
  el?.scrollIntoView({ block: 'start', behavior: 'instant' });
}
