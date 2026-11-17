import { Suspense, use, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crumbs } from '@/components/layout/Crumbs';
import { CourseSidebar } from '@/components/layout/CourseSidebar';
import { DocsLayout } from '@/components/layout/DocsLayout';
import { OnThisPage, type TocItem } from '@/components/layout/OnThisPage';
import { LessonContext } from '@/components/mdx/LessonContext';
import { mdxComponents } from '@/components/mdx/mdxComponents';
import { getCourse } from '@/content/courses';
import {
  getAdjacentLessons,
  getLessonMeta,
  loadLesson,
  type LessonModule,
} from '@/content/lessons';
import type { LessonMeta } from '@/content/types';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { lessonKey } from '@/progress/ProgressStore';
import { scrollToHash } from '@/hooks/scrollToHash';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import NotFoundPage from './NotFoundPage';

/** One promise per lesson file, so React's use() can suspend on it. */
const lessonPromises = new Map<string, Promise<LessonModule>>();
function lessonPromise(meta: LessonMeta) {
  let promise = lessonPromises.get(meta.file);
  if (!promise) {
    promise = loadLesson(meta);
    lessonPromises.set(meta.file, promise);
  }
  return promise;
}

function LessonBody({
  meta,
  onHeadings,
}: {
  meta: LessonMeta;
  onHeadings: (items: TocItem[]) => void;
}) {
  const { default: Content } = use(lessonPromise(meta));
  const ref = useRef<HTMLDivElement>(null);
  const { hash } = useLocation();

  // Collect headings for "On this page" once the lesson is on screen, then honour #anchors.
  useLayoutEffect(() => {
    const nodes = ref.current?.querySelectorAll<HTMLElement>('[data-toc][id]') ?? [];
    onHeadings(Array.from(nodes, (n) => ({ id: n.id, label: n.dataset.toc ?? n.id })));
    scrollToHash(window.location.hash);
  }, [meta.file, onHeadings]);

  useEffect(() => {
    scrollToHash(hash);
  }, [hash]);

  return (
    <div ref={ref}>
      <Content components={mdxComponents} />
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading lesson" className="space-y-4 py-6">
      {[80, 95, 60].map((w) => (
        <div key={w} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
      ))}
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function LessonPage() {
  const params = useParams();
  const course = getCourse(params.course);
  const meta = getLessonMeta(params.course, params.lesson);
  const store = useProgressStore();
  const progress = useProgress();
  const [headings, setHeadings] = useState<TocItem[]>([]);
  useDocumentTitle(meta ? `${meta.title} · ${course?.title}` : 'Lesson not found');

  useEffect(() => {
    if (course && meta) void store.markVisited(course.id, meta.id);
  }, [course, meta, store]);

  if (!course || !meta) return <NotFoundPage />;

  const { prev, next, index, total } = getAdjacentLessons(course.id, meta.id);
  const completed = progress.lessons[lessonKey(course.id, meta.id)]?.completed ?? false;

  return (
    <DocsLayout
      sidebar={(onNavigate) => (
        <CourseSidebar
          course={course}
          activeLesson={meta.id}
          onNavigate={onNavigate}
          className="h-full px-4 pt-6 pb-12"
        />
      )}
      sidebarLabel="Course navigation"
      drawerLabel={course.title}
      drawerButtonLabel="Open the lesson list"
      position={`Lesson ${index + 1} of ${total}`}
      toc={<OnThisPage items={headings} />}
    >
      <LessonContext value={{ course: course.id, lesson: meta.id }}>
        <article className="max-w-3xl">
          <Crumbs
            items={[
              { label: 'Courses', to: '/courses' },
              { label: course.title, to: `/courses/${course.id}` },
              { label: meta.title },
            ]}
          />
          <h1 className="mb-3 font-heading text-3xl font-bold tracking-tight md:text-4xl">
            {meta.title}
          </h1>
          <p className="mb-4 max-w-[680px] text-lg text-muted-foreground">{meta.summary}</p>
          <div className="mb-8 flex flex-wrap items-center gap-2 text-xs text-faint">
            <span className="inline-flex items-center gap-1">
              <ClockIcon aria-hidden className="size-3.5" />
              {meta.minutes} min
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Lesson {index + 1} of {total}
            </span>
            {completed && (
              <Badge variant="outline" className="border-success/60 text-success">
                <CheckIcon aria-hidden />
                Completed
              </Badge>
            )}
          </div>

          <Suspense fallback={<LessonSkeleton />}>
            <LessonBody key={meta.file} meta={meta} onHeadings={setHeadings} />
          </Suspense>

          <footer className="mt-14 border-t border-border pt-8">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                variant={completed ? 'outline' : 'default'}
                onClick={() => void store.markComplete(course.id, meta.id, !completed)}
                aria-pressed={completed}
                className={cn(completed && 'border-success/60 text-success')}
              >
                <CheckIcon aria-hidden />
                {completed ? 'Completed' : 'Mark as complete'}
              </Button>
              {completed && (
                <span className="text-sm text-muted-foreground">Click again to undo.</span>
              )}
            </div>
            <nav aria-label="Lesson navigation" className="mt-8 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link
                  to={`/courses/${course.id}/${prev.id}`}
                  className="group rounded-xl border border-border p-4 transition-colors hover:border-faint"
                >
                  <span className="flex items-center gap-1 text-xs text-faint">
                    <ArrowLeftIcon aria-hidden className="size-3.5" /> Previous
                  </span>
                  <span className="font-medium text-foreground group-hover:text-link">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  to={`/courses/${course.id}/${next.id}`}
                  className="group rounded-xl border border-border p-4 text-right transition-colors hover:border-faint"
                >
                  <span className="flex items-center justify-end gap-1 text-xs text-faint">
                    Next <ArrowRightIcon aria-hidden className="size-3.5" />
                  </span>
                  <span className="font-medium text-foreground group-hover:text-link">
                    {next.title}
                  </span>
                </Link>
              )}
            </nav>
          </footer>
        </article>
      </LessonContext>
    </DocsLayout>
  );
}
