import { memo } from 'react';
import type { ReferenceEntry } from '@/content/reference/parse';
import { ReactBadge, WarnBadge } from '@/components/ConceptBadges';
import { Playground } from '@/components/mdx/Playground';

/** One reference entry: name with badges and anchor, one sentence, runnable code. */
export const ReferenceEntryView = memo(function ReferenceEntryView({
  entry,
  hidden,
}: {
  entry: ReferenceEntry;
  hidden: boolean;
}) {
  return (
    <article
      id={entry.id}
      hidden={hidden}
      aria-labelledby={`${entry.id}-title`}
      className="scroll-mt-24 pt-7 pb-2"
    >
      <h3
        id={`${entry.id}-title`}
        className="group mb-1.5 flex flex-wrap items-center gap-2.5 font-mono text-lg font-semibold tracking-tight"
      >
        <span>{entry.name}</span>
        {entry.react && <ReactBadge />}
        {entry.warn && <WarnBadge />}
        <a
          href={`#${entry.id}`}
          aria-label={`Link to ${entry.name}`}
          className="font-sans text-faint opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          #
        </a>
      </h3>
      <p className="mb-3 max-w-[68ch] text-muted-foreground">
        {entry.desc}
        {entry.note && <em className="ml-1 text-faint"> {entry.note}</em>}
        {entry.varies && (
          <em className="ml-1 text-faint"> Your output will differ from the one shown.</em>
        )}
      </p>
      <Playground
        file={`${entry.id}.js`}
        code={entry.code}
        expected={entry.expected}
        browserOnly={entry.browserOnly}
      />
    </article>
  );
});
