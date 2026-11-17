import { Outlet, ScrollRestoration } from 'react-router';
import { SearchProvider } from '@/components/search/SearchContext';
import { Header } from './Header';

export function AppShell() {
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
        <ScrollRestoration />
      </div>
    </SearchProvider>
  );
}
