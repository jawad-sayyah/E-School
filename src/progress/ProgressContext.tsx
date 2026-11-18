import { createContext, use, useSyncExternalStore, type ReactNode } from 'react';
import { EMPTY_PROGRESS, type ProgressSnapshot, type ProgressStore } from './ProgressStore';

const ProgressContext = createContext<ProgressStore | null>(null);

export function ProgressProvider({
  store,
  children,
}: {
  store: ProgressStore;
  children: ReactNode;
}) {
  return <ProgressContext value={store}>{children}</ProgressContext>;
}

export function useProgressStore(): ProgressStore {
  const store = use(ProgressContext);
  if (!store) throw new Error('useProgressStore must be used inside <ProgressProvider>');
  return store;
}

/** The current progress snapshot; re-renders whenever progress changes. */
export function useProgress(): ProgressSnapshot {
  const store = useProgressStore();
  // Prerendered pages show a new visitor's view; saved progress appears right after hydration.
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY_PROGRESS);
}
