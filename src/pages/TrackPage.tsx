import { Link, useParams } from 'react-router';
import { AwardIcon, LockIcon, SwordsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CourseCard } from '@/components/CourseCard';
import { Crumbs } from '@/components/layout/Crumbs';
import { COURSE_ACCENT, COURSE_CHIP, COURSES } from '@/content/courses';
import { getTrack } from '@/content/tracks';
import { trackStatus } from '@/gamification/rules';
import { COURSE_REFS } from '@/gamification/useGamification';
import { useProgress } from '@/progress/ProgressContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import NotFoundPage from './NotFoundPage';

export default function TrackPage() {
  const { track: trackId } = useParams();
  const track = getTrack(trackId);
  const snapshot = useProgress();
  useDocumentTitle(track ? `${track.title} track` : 'Track not found');
  if (!track) return <NotFoundPage />;

  const status = trackStatus(track, COURSE_REFS, snapshot);
  const courses = track.courses
    .map((id) => COURSES.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  return (
    <main id="main" className="mx-auto max-w-6xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: 'Tracks', to: '/tracks' }, { label: track.title }]} />
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-12 place-items-center rounded-xl font-mono text-base font-bold',
            COURSE_CHIP[track.color],
          )}
        >
          {track.badge}
        </span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">{track.title}</h1>
      </div>
      <p className="mb-8 max-w-2xl text-lg text-muted-foreground">{track.description}</p>

      {status.totalLessons > 0 && (
        <div className="mb-10 max-w-2xl">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>
              {status.completedLessons} of {status.totalLessons} lessons complete
            </span>
            <span className="font-medium text-foreground">{status.percent}%</span>
          </div>
          <Progress
            value={status.percent}
            indicatorClassName={COURSE_ACCENT[track.color]}
            className="h-2"
            aria-label={`${track.title} track progress`}
          />
        </div>
      )}

      {track.project ? (
        <Card className="max-w-2xl p-6">
          <p className="text-muted-foreground">
            This track is a guided project. It arrives in phase {track.phase}.
          </p>
          <Button asChild variant="outline" className="self-start">
            <Link to="/project">About the project</Link>
          </Button>
        </Card>
      ) : (
        <>
          <h2 className="mb-4 font-heading text-xl font-bold">Courses</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} />
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Card className="flex-row items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-danger/15 text-danger">
                <SwordsIcon aria-hidden className="size-6" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold">Boss challenge</h2>
                <p className="text-sm text-muted-foreground">
                  {status.bossPassed && track.boss
                    ? 'Defeated. Well done!'
                    : `A big mixed challenge at the end of the track. It arrives in phase ${track.phase}.`}
                </p>
              </div>
            </Card>
            <Card className="flex-row items-center gap-4 p-5">
              <span
                className={cn(
                  'grid size-12 shrink-0 place-items-center rounded-xl',
                  status.certified ? 'bg-js text-on-light' : 'bg-muted text-faint',
                )}
              >
                {status.certified ? (
                  <AwardIcon aria-hidden className="size-6" />
                ) : (
                  <LockIcon aria-hidden className="size-5" />
                )}
              </span>
              <div className="flex-1">
                <h2 className="font-heading text-lg font-semibold">Certificate</h2>
                <p className="text-sm text-muted-foreground">
                  {status.certified
                    ? 'You earned it.'
                    : 'Complete every lesson and the boss challenge to earn it.'}
                </p>
              </div>
              <Button asChild variant={status.certified ? 'default' : 'outline'} size="sm">
                <Link to={`/certificates/${track.id}`}>
                  {status.certified ? 'View' : 'Preview'}
                </Link>
              </Button>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
