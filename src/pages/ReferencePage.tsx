import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { SearchIcon, XIcon } from 'lucide-react';
import reference from 'virtual:reference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crumbs } from '@/components/layout/Crumbs';
import { DocsLayout } from '@/components/layout/DocsLayout';
import { OnThisPage } from '@/components/layout/OnThisPage';
import { Callout } from '@/components/mdx/Callout';
import { ReferenceEntryView } from '@/components/reference/ReferenceEntryView';
import { ReferenceSidebar } from '@/components/reference/ReferenceSidebar';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { scrollToHash } from '@/hooks/scrollToHash';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Lowercased name + description + code, for the in-page filter (as in the original page). */
const haystack = new Map(
  reference.entries.map((e) => [e.id, `${e.name} ${e.desc} ${e.code}`.toLowerCase()]),
);

export default function ReferencePage() {
  useDocumentTitle('JavaScript Quick Reference');
  const [query, setQuery] = useState('');
  const term = useDeferredValue(query.trim().toLowerCase());
  const { hash } = useLocation();

  const visible = useMemo(
    () =>
      new Set(
        reference.entries
          .filter((e) => !term || haystack.get(e.id)!.includes(term))
          .map((e) => e.id),
      ),
    [term],
  );
  const visibleIds = reference.entries.filter((e) => visible.has(e.id)).map((e) => e.id);
  const active = useScrollSpy(visibleIds);

  // The "On this page" list shows the entries of the section you're reading.
  const activeSection = reference.entries.find((e) => e.id === active)?.section;
  const tocItems = reference.entries
    .filter((e) => e.section === activeSection && visible.has(e.id))
    .map((e) => ({ id: e.id, label: e.name }));

  useEffect(() => {
    scrollToHash(hash);
  }, [hash]);

  return (
    <DocsLayout
      sidebar={(onNavigate) => (
        <ReferenceSidebar
          data={reference}
          visible={visible}
          active={active}
          onNavigate={onNavigate}
        />
      )}
      sidebarLabel="Reference navigation"
      drawerLabel="Quick Reference"
      drawerButtonLabel="Open the reference sections"
      toc={<OnThisPage items={tocItems} />}
    >
      <div className="max-w-3xl">
        <Crumbs items={[{ label: 'Reference' }, { label: 'JavaScript' }]} />
        <h1 className="mb-3 font-heading text-3xl font-bold tracking-tight md:text-4xl">
          JavaScript Quick Reference
        </h1>
        <p className="mb-6 max-w-[680px] text-lg text-muted-foreground">
          Every concept in one sentence, with code you can edit and run. Built around the same
          shopping cart from the course.
        </p>
        <Callout type="tip">
          Edit any example and press <strong>Run</strong> (or Ctrl + Enter) to see the result.{' '}
          <strong>Used in React</strong> marks what you’ll need most in React.
        </Callout>

        <div className="relative mb-4">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('');
            }}
            placeholder="Filter the reference, e.g. reduce or fetch"
            aria-label="Filter the reference"
            className="h-10 pr-10 pl-9"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear the filter"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-1.5 -translate-y-1/2"
            >
              <XIcon aria-hidden />
            </Button>
          )}
        </div>
        <p className="mb-2 text-xs text-faint" aria-live="polite">
          {term
            ? `${visible.size} of ${reference.entries.length} entries`
            : `${reference.entries.length} entries`}
        </p>

        {reference.sections.map((section) => {
          const entries = reference.entries.filter((e) => e.section === section.id);
          const shown = entries.some((e) => visible.has(e.id));
          return (
            <section
              key={section.id}
              hidden={!shown}
              aria-labelledby={`section-${section.id}`}
              className="mt-6 border-t border-border pt-6"
            >
              <h2
                id={`section-${section.id}`}
                className="mb-1.5 scroll-mt-24 font-heading text-2xl font-bold tracking-tight"
              >
                {section.title}
              </h2>
              <p className="max-w-[68ch] text-muted-foreground">{section.intro}</p>
              {entries.map((entry) => (
                <ReferenceEntryView key={entry.id} entry={entry} hidden={!visible.has(entry.id)} />
              ))}
            </section>
          );
        })}

        {visible.size === 0 && (
          <p className="py-20 text-center text-faint">
            No results for <strong className="text-foreground">“{query.trim()}”</strong>. Try a
            shorter word.
          </p>
        )}
      </div>
    </DocsLayout>
  );
}
