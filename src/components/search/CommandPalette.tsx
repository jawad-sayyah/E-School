import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpenIcon, HashIcon } from 'lucide-react';
import docs from 'virtual:search-docs';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { createSearchIndex, searchGrouped } from '@/search/searchIndex';

const index = createSearchIndex(docs);

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full-text search over every lesson and concept. Lazy-loaded with its index. */
export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const groups = useMemo(() => searchGrouped(index, query), [query]);

  const go = (url: string) => {
    onOpenChange(false);
    setQuery('');
    void navigate(url);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search lessons"
      description="Search lesson titles, concepts, tags and code"
      className="sm:max-w-xl"
    >
      {/* We rank results ourselves (MiniSearch), so cmdk's own filter is off. */}
      <Command shouldFilter={false} className="bg-popover">
        <CommandInput
          placeholder="Search lessons, concepts and code…"
          value={query}
          onValueChange={setQuery}
          aria-label="Search lessons"
        />
        <CommandList className="max-h-[min(60vh,440px)]">
          {query.trim() && (
            <CommandEmpty>No results for “{query.trim()}”. Try a shorter word.</CommandEmpty>
          )}
          {!query.trim() && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Try “reduce”, “template literal” or “closures”.
            </p>
          )}
          {groups.map((group) => (
            <CommandGroup key={group.course} heading={group.courseTitle}>
              {group.hits.map((hit) => (
                <CommandItem key={hit.id} value={hit.id} onSelect={() => go(hit.url)}>
                  {hit.kind === 'concept' ? (
                    <HashIcon aria-hidden className="text-faint" />
                  ) : (
                    <BookOpenIcon aria-hidden className="text-faint" />
                  )}
                  <span
                    className={hit.kind === 'concept' ? 'font-mono text-[13px]' : 'font-medium'}
                  >
                    {hit.title}
                  </span>
                  {hit.kind === 'concept' && (
                    <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">
                      {hit.lessonTitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
