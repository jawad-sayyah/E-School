import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { MenuIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSearch } from '@/components/search/SearchContext';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/courses', label: 'Courses' },
  { to: '/project', label: 'Project' },
  { to: '/reference', label: 'Reference' },
  { to: '/progress', label: 'Progress' },
];

export function Logo() {
  return (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-2.5 rounded-md"
      aria-label="E School home"
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-lg bg-js font-mono text-[13px] font-bold text-on-light"
      >
        ES
      </span>
      <span className="font-heading text-base font-bold whitespace-nowrap">E School</span>
    </Link>
  );
}

function SearchButton() {
  const { open } = useSearch();
  return (
    <Button
      variant="outline"
      onClick={open}
      aria-label="Search lessons (press / or Ctrl+K)"
      className="h-9 w-full max-w-md justify-start gap-2 rounded-lg bg-sidebar px-3 font-normal text-faint hover:text-muted-foreground md:min-w-56"
    >
      <SearchIcon aria-hidden />
      <span className="hidden sm:inline">Search the docs…</span>
      <Kbd className="ml-auto hidden sm:inline-flex">/</Kbd>
    </Button>
  );
}

function NavLinks({
  onNavigate,
  vertical = false,
}: {
  onNavigate?: () => void;
  vertical?: boolean;
}) {
  return (
    <nav aria-label="Main" className={cn('flex gap-1', vertical && 'flex-col')}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive && 'bg-accent text-accent-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 md:gap-5 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon aria-hidden />
        </Button>
        <Logo />
        <div className="hidden md:block">
          <NavLinks />
        </div>
        <div className="flex flex-1 justify-end md:justify-center">
          <SearchButton />
        </div>
        <ThemeToggle />
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>E School</SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <NavLinks vertical onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
