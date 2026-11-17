import { createContext, lazy, Suspense, use, useEffect, useState, type ReactNode } from 'react';

const CommandPalette = lazy(() => import('./CommandPalette'));

interface SearchContextValue {
  open: () => void;
}

const SearchContext = createContext<SearchContextValue>({ open: () => undefined });

export const useSearch = () => use(SearchContext);

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** Owns the palette's open state and the "/" and Ctrl/Cmd+K shortcuts. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  // The palette (MiniSearch + the index) only loads the first time it opens.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isTyping(e.target))) {
        e.preventDefault();
        setLoaded(true);
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const open = () => {
    setLoaded(true);
    setOpen(true);
  };

  return (
    <SearchContext value={{ open }}>
      {children}
      {loaded && (
        <Suspense fallback={null}>
          <CommandPalette open={isOpen} onOpenChange={setOpen} />
        </Suspense>
      )}
    </SearchContext>
  );
}
