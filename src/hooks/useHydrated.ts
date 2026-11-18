import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * False while prerendering and while React hydrates the prerendered HTML; true afterwards
 * (and straight away when there was nothing to hydrate). Anything that reads the browser
 * (localStorage, the date) during render must wait for it, so the first render in the browser
 * matches the HTML exactly.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
