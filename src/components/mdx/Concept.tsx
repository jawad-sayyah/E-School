import type { ReactNode } from 'react';
import { slugify } from '@/lib/slug';
import { ReactBadge, WarnBadge } from '@/components/ConceptBadges';

interface ConceptProps {
  name: string;
  /** Anchor id. Defaults to the slug of the name; set it for names like "===". */
  id?: string;
  react?: boolean;
  warn?: boolean;
  children?: ReactNode;
}

/** One concept: a heading with badges and an anchor link, then its sentence and code. */
export function Concept({ name, id, react, warn, children }: ConceptProps) {
  const anchor = id ?? slugify(name);
  return (
    <section aria-labelledby={anchor} className="border-t border-border pt-8 pb-2 first:border-t-0">
      <h2
        id={anchor}
        data-toc={name}
        className="group mb-2 flex scroll-mt-24 flex-wrap items-center gap-2.5 font-mono text-xl font-semibold tracking-tight"
      >
        <span>{name}</span>
        {react && <ReactBadge />}
        {warn && <WarnBadge />}
        <a
          href={`#${anchor}`}
          aria-label={`Link to ${name}`}
          className="font-sans text-faint opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          #
        </a>
      </h2>
      {children}
    </section>
  );
}
