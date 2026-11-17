import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { CheckIcon } from 'lucide-react';
import { COURSE_CHIP } from '@/content/courses';
import { getCourseLessons } from '@/content/lessons';
import type { CourseInfo } from '@/content/types';
import { keepInView } from '@/hooks/keepInView';
import { useProgress } from '@/progress/ProgressContext';
import { lessonKey } from '@/progress/ProgressStore';
import { cn } from '@/lib/utils';

interface CourseSidebarProps {
  course: CourseInfo;
  activeLesson?: string;
  onNavigate?: () => void;
  /** The element that scrolls (for auto-scrolling the active lesson into view). */
  className?: string;
}

/** The course's lessons with ✓ marks. Keeps the active lesson scrolled into view. */
export function CourseSidebar({ course, activeLesson, onNavigate, className }: CourseSidebarProps) {
  const progress = useProgress();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lessons = getCourseLessons(course.id);

  useEffect(() => {
    const container = scrollRef.current;
    keepInView(container, container?.querySelector<HTMLElement>('[aria-current="page"]') ?? null);
  }, [activeLesson]);

  return (
    <div ref={scrollRef} className={cn('overflow-y-auto overscroll-contain', className)}>
      <Link
        to={`/courses/${course.id}`}
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-sidebar-accent"
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-7 place-items-center rounded-md font-mono text-[11px] font-bold',
            COURSE_CHIP[course.color],
          )}
        >
          {course.badge}
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">{course.title}</span>
      </Link>
      <p className="mx-2 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Lessons
      </p>
      <nav aria-label={`${course.title} lessons`}>
        <ol className="space-y-0.5">
          {lessons.map((lesson, i) => {
            const active = lesson.id === activeLesson;
            const done = progress.lessons[lessonKey(course.id, lesson.id)]?.completed;
            return (
              <li key={lesson.id}>
                <Link
                  to={`/courses/${course.id}/${lesson.id}`}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    active && 'bg-sidebar-accent font-semibold text-sidebar-primary',
                  )}
                >
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-faint">
                    {i + 1}
                  </span>
                  <span className="flex-1">{lesson.title}</span>
                  {done && (
                    <>
                      <CheckIcon aria-hidden className="size-4 shrink-0 text-success" />
                      <span className="sr-only">(completed)</span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
