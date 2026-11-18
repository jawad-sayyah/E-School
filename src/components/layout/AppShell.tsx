import { lazy, Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { SearchProvider } from '@/components/search/SearchContext';
import { scrollKey } from '@/lib/scrollKey';
import { useHydrated } from '@/hooks/useHydrated';
import { Header } from './Header';

// Toasts (sonner) aren't needed for the first paint: load them after it.
const GamificationNotifier = lazy(() =>
  import('@/components/gamification/GamificationNotifier').then((m) => ({
    default: m.GamificationNotifier,
  })),
);

export function AppShell() {
  const hydrated = useHydrated();
  return (
    <SearchProvider>
      <div className="min-h-screen bg-background">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Header />
        <Outlet />
        {hydrated && <ScrollRestoration getKey={scrollKey} />}
        <Suspense fallback={null}>
          <GamificationNotifier />
        </Suspense>
      </div>
    </SearchProvider>
  );
}
