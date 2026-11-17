import { useEffect, useRef } from 'react';
import type { ReferenceData } from '@/content/reference/parse';
import { keepInView } from '@/hooks/keepInView';
import { cn } from '@/lib/utils';

interface ReferenceSidebarProps {
  data: ReferenceData;
  visible: Set<string>;
  active: string | null;
  onNavigate?: () => void;
}

/** Sections and their entries. Keeps the active entry scrolled into view. */
export function ReferenceSidebar({ data, visible, active, onNavigate }: ReferenceSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    keepInView(
      container,
      container?.querySelector<HTMLElement>('[aria-current="location"]') ?? null,
    );
  }, [active]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain px-4 pt-6 pb-12">
      <nav aria-label="Reference sections">
        {data.sections.map((section) => {
          const entries = data.entries.filter((e) => e.section === section.id && visible.has(e.id));
          if (!entries.length) return null;
          return (
            <div key={section.id} className="mb-4">
              <p className="mx-2 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
                {section.title}
              </p>
              <ul className="space-y-px">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      onClick={onNavigate}
                      aria-current={entry.id === active ? 'location' : undefined}
                      className={cn(
                        'block rounded-md px-2.5 py-1 font-mono text-[13px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        entry.id === active &&
                          'bg-sidebar-accent font-semibold text-sidebar-primary',
                      )}
                    >
                      {entry.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
