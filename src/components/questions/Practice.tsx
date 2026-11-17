import { Children, isValidElement, type ReactNode } from 'react';
import { DumbbellIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLessonRef } from '@/components/mdx/LessonContext';
import { useProgress } from '@/progress/ProgressContext';
import { slugify } from '@/lib/slug';

/** A titled group of questions with a "3 of 5 done" bar. */
export function Practice({
  title = 'Practice',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  const lesson = useLessonRef();
  const questions = useProgress().questions;
  const ids = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => (el.props as { id?: unknown }).id)
    .filter((id): id is string => typeof id === 'string');
  const done = ids.filter(
    (id) => questions[`${lesson.course}/${lesson.lesson}/${id}`]?.correct,
  ).length;
  const anchor = slugify(title);

  return (
    <section aria-labelledby={anchor} className="mt-12">
      <div className="mb-2 flex flex-wrap items-center gap-3 border-t border-border pt-8">
        <DumbbellIcon aria-hidden className="size-5 text-faint" />
        <h2
          id={anchor}
          data-toc={title}
          className="scroll-mt-24 font-heading text-2xl font-bold tracking-tight"
        >
          {title}
        </h2>
        {ids.length > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {done} of {ids.length} done
            </span>
            <Progress
              value={(done / ids.length) * 100}
              indicatorClassName="bg-success"
              className="w-24"
              aria-label={`${title}: ${done} of ${ids.length} questions done`}
            />
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
