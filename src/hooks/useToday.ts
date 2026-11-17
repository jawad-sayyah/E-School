import { useSyncExternalStore } from 'react';
import { dayKey } from '@/progress/ProgressStore';

/** Re-checks the date at the next local midnight (and when the tab becomes visible again). */
function subscribe(onChange: () => void) {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const timer = setTimeout(onChange, midnight - now.getTime() + 1000);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onChange);
  };
}

const getToday = () => dayKey(Date.now());

/** Today's local date as "YYYY-MM-DD"; updates when the day changes. */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getToday, getToday);
}
