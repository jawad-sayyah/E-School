import { useEffect, useRef } from 'react';
import { keepInView } from '@/hooks/keepInView';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  label: string;
}

/** Right-hand "On this page" list with scrollspy; keeps the active item in view. */
export function OnThisPage({ items }: { items: TocItem[] }) {
  const active = useScrollSpy(items.map((i) => i.id));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    keepInView(
      container,
      container?.querySelector<HTMLElement>('[aria-current="location"]') ?? null,
    );
  }, [active]);

  if (!items.length) return null;
  return (
    <div ref={scrollRef} className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto px-4 py-10">
      <p className="mb-2.5 text-xs font-semibold text-foreground">On this page</p>
      <nav aria-label="On this page">
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={item.id === active ? 'location' : undefined}
                className={cn(
                  'block border-l-2 border-border py-1 pl-3 font-mono text-[12.5px] leading-snug text-faint transition-colors hover:text-foreground',
                  item.id === active && 'border-link text-link',
                )}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
