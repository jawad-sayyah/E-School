import { Link } from 'react-router';
import { AwardIcon, CheckIcon, LockIcon, RotateCcwIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CourseChip } from '@/components/CourseCard';
import { Crumbs } from '@/components/layout/Crumbs';
import { COURSE_ACCENT, COURSES } from '@/content/courses';
import { getCourseLessons, getLessonMeta } from '@/content/lessons';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { computeCourseProgress, lessonKey } from '@/progress/ProgressStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BadgeGrid, StatsRow } from '@/components/gamification/Stats';
import { TRACKS } from '@/content/tracks';
import { trackStatus } from '@/gamification/rules';
import { COURSE_REFS } from '@/gamification/useGamification';
import { cn } from '@/lib/utils';

export default function ProgressPage() {
  useDocumentTitle('Your progress');
  const snapshot = useProgress();
  const store = useProgressStore();
  const quizzes = Object.entries(snapshot.quizzes);
  const exercisesPassed = Object.values(snapshot.exercises).filter((e) => e.passed).length;

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: 'Progress' }]} />
      <h1 className="mb-3 font-heading text-4xl font-bold tracking-tight">Your progress</h1>
      <p className="mb-10 text-lg text-muted-foreground">
        Saved in this browser. {exercisesPassed} exercise{exercisesPassed === 1 ? '' : 's'} passed
        so far.
      </p>

      <StatsRow />

      <h2 className="mt-12 mb-4 font-heading text-2xl font-bold">Badges</h2>
      <BadgeGrid />

      <h2 className="mt-12 mb-4 font-heading text-2xl font-bold">Certificates</h2>
      <ul className="mb-12 grid gap-3 sm:grid-cols-2">
        {TRACKS.filter((t) => !t.project).map((track) => {
          const status = trackStatus(track, COURSE_REFS, snapshot);
          return (
            <li key={track.id}>
              <Link
                to={`/certificates/${track.id}`}
                className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
              >
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-full',
                    status.certified ? 'bg-js text-on-light' : 'bg-muted text-faint',
                  )}
                >
                  {status.certified ? (
                    <AwardIcon aria-hidden className="size-5" />
                  ) : (
                    <LockIcon aria-hidden className="size-4" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{track.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {status.certified
                      ? 'Earned: view and print'
                      : status.totalLessons
                        ? `${status.percent}% of the track done`
                        : 'Not started'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-4 font-heading text-2xl font-bold">Courses</h2>

      <div className="space-y-4">
        {COURSES.map((course) => {
          const lessons = getCourseLessons(course.id);
          const p = computeCourseProgress(
            snapshot,
            course.id,
            lessons.map((l) => l.id),
          );
          const done = lessons.filter(
            (l) => snapshot.lessons[lessonKey(course.id, l.id)]?.completed,
          );
          return (
            <Card key={course.id} className="gap-3 py-5">
              <CardHeader className="flex flex-row items-center gap-3">
                <CourseChip course={course} />
                <CardTitle className="flex-1 font-heading">
                  <Link to={`/courses/${course.id}`} className="hover:text-link">
                    {course.title}
                  </Link>
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {lessons.length ? `${p.completed} / ${p.total}` : `Phase ${course.phase}`}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress
                  value={p.percent}
                  indicatorClassName={COURSE_ACCENT[course.color]}
                  aria-label={`${course.title} progress`}
                />
                {done.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {done.map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/courses/${course.id}/${l.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <CheckIcon aria-hidden className="size-3 text-success" />
                          {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="mt-12 mb-4 font-heading text-2xl font-bold">Quiz scores</h2>
      {quizzes.length === 0 ? (
        <p className="text-muted-foreground">No quizzes taken yet. Every lesson ends with one.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {quizzes.map(([id, score]) => {
            const [course, lesson] = id.split('/');
            const meta = getLessonMeta(course, lesson);
            return (
              <li key={id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link to={`/courses/${course}/${lesson}`} className="hover:text-link">
                  {meta?.title ?? id}
                </Link>
                <span className="font-mono text-sm text-muted-foreground">
                  {score.best} / {score.total}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-12">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <RotateCcwIcon aria-hidden />
              Reset progress
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears completed lessons, quiz scores and passed exercises in this browser. It
                can’t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void store.reset()}>
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
