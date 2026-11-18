import { useState } from 'react';

/*
 * Entrance animations (fade or slide in on mount) only for content that appears after the
 * first page load. Prerendered HTML must be visible as it is, and the first client render
 * must look exactly like it, or the page would flash: invisible, then fading back in.
 */
let ready = false;

/** Called by main.tsx once the first client render is on screen. */
export function allowEntranceAnimations() {
  ready = true;
}

/** Whether this component (on mount) may play an entrance animation. */
export function useEntranceAllowed(): boolean {
  const [allowed] = useState(() => ready && !import.meta.env.SSR);
  return allowed;
}
