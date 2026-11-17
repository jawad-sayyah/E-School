import type { Location } from 'react-router';

/**
 * Key for <ScrollRestoration>. Scroll positions are saved per history entry, and the first
 * entry of every page load is keyed "default", so opening a new URL in the tab could
 * restore the scroll position of a different page (and win over its #hash). That first
 * entry is keyed by its path and hash instead.
 */
export function scrollKey(location: Pick<Location, 'key' | 'pathname' | 'hash'>): string {
  return location.key === 'default' ? `${location.pathname}${location.hash}` : location.key;
}
