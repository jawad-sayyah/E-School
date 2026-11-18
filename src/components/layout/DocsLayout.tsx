import { useState, type ReactNode } from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

interface DocsLayoutProps {
  /** Renders the left sidebar; `onNavigate` closes the mobile drawer after a click. */
  sidebar: (onNavigate?: () => void) => ReactNode;
  /** Accessible name of the sidebar, e.g. "Course navigation". */
  sidebarLabel: string;
  /** Text on the mobile drawer button, e.g. the course title. */
  drawerLabel: string;
  /** Accessible name of the mobile drawer button, e.g. "Open the lesson list". */
  drawerButtonLabel: string;
  /** Mobile bar label, e.g. "Lesson 3 of 10". */
  position?: string;
  toc?: ReactNode;
  children: ReactNode;
}

/** Three columns: sidebar | content | "On this page". The sidebar is a drawer on mobile. */
export function DocsLayout({
  sidebar,
  sidebarLabel,
  drawerLabel,
  drawerButtonLabel,
  position,
  toc,
  children,
}: DocsLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] toc:grid-cols-[260px_minmax(0,1fr)_220px]">
      <aside
        aria-label={sidebarLabel}
        className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-border bg-sidebar md:block"
      >
        {sidebar()}
      </aside>

      <div className="min-w-0">
        <div className="sticky top-16 z-30 flex h-11 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            // Starts with the visible text, so voice control users can say what they see.
            aria-label={`${drawerLabel}: ${drawerButtonLabel}`}
          >
            <PanelLeftIcon aria-hidden />
            {drawerLabel}
          </Button>
          {position && <span className="ml-auto text-xs text-faint">{position}</span>}
        </div>
        <main id="main" className="px-5 pt-8 pb-28 md:px-10 lg:px-14">
          {children}
        </main>
      </div>

      <aside aria-label="On this page" className="hidden toc:block">
        {toc}
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 bg-sidebar p-0">
          <SheetTitle className="sr-only">{sidebarLabel}</SheetTitle>
          <SheetDescription className="sr-only">Pick a page</SheetDescription>
          {drawerOpen && sidebar(() => setDrawerOpen(false))}
        </SheetContent>
      </Sheet>
    </div>
  );
}
