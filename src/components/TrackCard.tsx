import { Link } from 'react-router';
import { ArrowRightIcon, AwardIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { COURSE_ACCENT, COURSE_CHIP, getCourse } from '@/content/courses';
import type { TrackInfo } from '@/content/types';
import { trackStatus } from '@/gamification/rules';
import { COURSE_REFS } from '@/gamification/useGamification';
import { useProgress } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';

/** A learning track with its courses, progress and certificate state. */
export function TrackCard({ track, index }: { track: TrackInfo; index: number }) {
  const snapshot = useProgress();
  const status = trackStatus(track, COURSE_REFS, snapshot);
  const started = status.totalLessons > 0;

  return (
    <Card className="relative gap-4 transition-colors hover:border-faint">
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'grid size-10 place-items-center rounded-xl font-mono text-sm font-bold',
              COURSE_CHIP[track.color],
            )}
          >
            {track.badge}
          </span>
          <span className="text-xs font-medium text-faint">Track {index + 1}</span>
          {status.certified ? (
            <Badge className="ml-auto border-transparent bg-js text-on-light">
              <AwardIcon aria-hidden />
              Certified
            </Badge>
          ) : !status.available ? (
            <Badge variant="outline" className="ml-auto text-faint">
              {started ? 'Growing' : `Phase ${track.phase}`}
            </Badge>
          ) : null}
        </div>
        <CardTitle className="font-heading text-xl">
          <Link
            to={`/tracks/${track.id}`}
            className="after:absolute after:inset-0 after:rounded-xl"
          >
            {track.title}
          </Link>
        </CardTitle>
        <CardDescription className="leading-relaxed">{track.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        {!track.project && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Courses in this track">
            {track.courses.map((id) => (
              <li
                key={id}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {getCourse(id)?.title}
              </li>
            ))}
          </ul>
        )}
        {started && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {status.completedLessons} of {status.totalLessons} lessons
              </span>
              <span>{status.percent}%</span>
            </div>
            <Progress
              value={status.percent}
              indicatorClassName={COURSE_ACCENT[track.color]}
              aria-label={`${track.title} track progress`}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm font-medium text-link">
        {started ? 'Open track' : 'See what’s coming'}
        <ArrowRightIcon aria-hidden className="ml-1 size-4" />
      </CardFooter>
    </Card>
  );
}
