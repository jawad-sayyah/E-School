import { Link, useParams } from 'react-router';
import { ArrowRightIcon, CheckIcon, ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CourseChip } from '@/components/CourseCard';
import { Crumbs } from '@/components/layout/Crumbs';
import { COURSE_ACCENT, getCourse } from '@/content/courses';
import { getCourseLessons } from '@/content/lessons';
import { useProgress } from '@/progress/ProgressContext';
import { computeCourseProgress, lessonKey } from '@/progress/ProgressStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import NotFoundPage from './NotFoundPage';

export default function CoursePage() {
  const { course: courseId } = useParams();
  const course = getCourse(courseId);
  const snapshot = useProgress();
  useDocumentTitle(course?.title ?? 'Course not found');
  if (!course) return <NotFoundPage />;

  const lessons = getCourseLessons(course.id);
  const progress = computeCourseProgress(
    snapshot,
    course.id,
    lessons.map((l) => l.id),
  );
  const nextLesson =
    lessons.find((l) => !snapshot.lessons[lessonKey(course.id, l.id)]?.completed) ?? lessons[0];
  const minutes = lessons.reduce((sum, l) => sum + l.minutes, 0);

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: 'Courses', to: '/courses' }, { label: course.title }]} />
      <div className="mb-4 flex items-center gap-3">
        <CourseChip course={course} className="size-11 text-sm" />
        <h1 className="font-heading text-4xl font-bold tracking-tight">{course.title}</h1>
      </div>
      <p className="mb-8 max-w-2xl text-lg text-muted-foreground">{course.description}</p>

      {lessons.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          This course arrives in phase {course.phase}. Start with{' '}
          <Link
            to="/courses/js-basics"
            className="font-medium text-link underline underline-offset-4"
          >
            JavaScript Basics
          </Link>{' '}
          in the meantime.
        </p>
      ) : (
        <>
          <div className="mb-10 rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {progress.completed} of {progress.total} lessons complete · about {minutes} minutes
                in total
              </span>
              <span className="font-medium text-foreground">{progress.percent}%</span>
            </div>
            <Progress
              value={progress.percent}
              indicatorClassName={COURSE_ACCENT[course.color]}
              className="h-2"
              aria-label={`${course.title} progress`}
            />
            {nextLesson && (
              <Button asChild className="mt-5">
                <Link to={`/courses/${course.id}/${nextLesson.id}`}>
                  {progress.completed === 0
                    ? 'Start the course'
                    : progress.percent === 100
                      ? 'Review'
                      : 'Continue'}
                  <ArrowRightIcon aria-hidden />
                </Link>
              </Button>
            )}
          </div>

          <h2 className="mb-4 font-heading text-xl font-bold">Lessons</h2>
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {lessons.map((lesson, i) => {
              const done = snapshot.lessons[lessonKey(course.id, lesson.id)]?.completed;
              return (
                <li key={lesson.id}>
                  <Link
                    to={`/courses/${course.id}/${lesson.id}`}
                    className="flex items-start gap-4 p-4 transition-colors hover:bg-accent/50"
                  >
                    <span
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-full border font-mono text-xs',
                        done
                          ? 'border-success bg-success/10 text-success'
                          : 'border-border text-faint',
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
        </>
      )}
    </main>
  );
}
