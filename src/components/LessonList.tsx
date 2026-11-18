import { Link } from 'react-router';
import { CheckIcon, ClockIcon } from 'lucide-react';
import type { LessonMeta } from '@/content/types';
import { useProgress } from '@/progress/ProgressContext';
import { lessonKey } from '@/progress/ProgressStore';
import { cn } from '@/lib/utils';

/** A course's lessons (or a project's steps) in order, with completion marks. */
export function LessonList({ courseId, lessons }: { courseId: string; lessons: LessonMeta[] }) {
  const snapshot = useProgress();
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {lessons.map((lesson, i) => {
        const done = snapshot.lessons[lessonKey(courseId, lesson.id)]?.completed;
        return (
          <li key={lesson.id}>
            <Link
              to={`/courses/${courseId}/${lesson.id}`}
              className="flex items-start gap-4 p-4 transition-colors hover:bg-accent/50"
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full border font-mono text-xs',
                  done ? 'border-success bg-success/10 text-success' : 'border-border text-faint',
                )}
              >
                {done ? <CheckIcon aria-label="Completed" className="size-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {lesson.title}
                  {lesson.kind !== 'lesson' && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                        lesson.kind === 'boss'
                          ? 'bg-danger/15 text-danger'
                          : 'bg-syn-kw/15 text-syn-kw',
                      )}
                    >
                      {lesson.kind === 'boss' ? 'Boss' : 'Review'}
                    </span>
                  )}
                </span>
                <span className="block text-sm text-muted-foreground">{lesson.summary}</span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 text-xs text-faint sm:inline-flex">
                <ClockIcon aria-hidden className="size-3.5" />
                {lesson.minutes} min
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
