import { Link } from 'react-router';
import { m, useReducedMotion } from 'motion/react';
import { ArrowRightIcon, PlayIcon, ShoppingCartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CourseCard, CourseChip } from '@/components/CourseCard';
import { StatsRow } from '@/components/gamification/Stats';
import { TrackCard } from '@/components/TrackCard';
import { COURSES, getCourse } from '@/content/courses';
import { getCourseLessons, getLessonMeta } from '@/content/lessons';
import { TRACKS } from '@/content/tracks';
import { useProgress } from '@/progress/ProgressContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntranceAllowed } from '@/lib/entrance';

function ContinueCard() {
  const last = useProgress().lastVisited;
  const course = getCourse(last?.course);
  const lesson = getLessonMeta(last?.course, last?.lesson);
  if (!last || !course || !lesson) return null;
  return (
    <section aria-labelledby="continue-title">
      <Card className="py-4">
        <CardContent className="flex flex-wrap items-center gap-4">
          <CourseChip course={course} />
          <div className="min-w-0 flex-1">
            <h2
              id="continue-title"
              className="text-xs font-semibold tracking-[0.08em] text-faint uppercase"
            >
              Continue where you left off
            </h2>
            <p className="font-heading text-lg font-semibold">{lesson.title}</p>
            <p className="text-sm text-muted-foreground">{course.title}</p>
          </div>
          <Button asChild>
            <Link to={`/courses/${course.id}/${lesson.id}`}>
              Continue
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle('Learn JavaScript, React, TypeScript and testing');
  const reduce = useReducedMotion();
  const entrance = useEntranceAllowed();
  const started = Object.keys(useProgress().lessons).length > 0;
  const available = COURSES.filter((c) => getCourseLessons(c.id).length > 0);
  const rise = (delay: number) =>
    reduce || !entrance
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <main id="main" className="mx-auto max-w-6xl space-y-14 px-5 pt-14 pb-24 md:px-8">
      <section className="max-w-3xl">
        <m.p
          {...rise(0)}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
        >
          <ShoppingCartIcon aria-hidden className="size-3.5" />
          One shopping cart, from plain JavaScript to a deployed React website
        </m.p>
        <m.h1
          {...rise(0.05)}
          className="mb-5 font-heading text-4xl leading-[1.1] font-bold tracking-tight md:text-5xl"
        >
          Get productive in <span className="text-js">JavaScript</span>,{' '}
          <span className="text-react">React</span>, <span className="text-ts">TypeScript</span> and{' '}
          <span className="text-testing">testing</span>.
        </m.h1>
        <m.p {...rise(0.1)} className="mb-8 max-w-2xl text-lg text-muted-foreground">
          Short lessons, one idea at a time, with a deeper layer when you’re curious. Run every
          example right here, answer a dozen kinds of questions, pass exercises checked by real
          tests, and earn XP, streaks and certificates as you go.
        </m.p>
        <m.div {...rise(0.15)} className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/courses/js-basics/variables">
              <PlayIcon aria-hidden className="fill-current" />
              {started ? 'Start from lesson 1' : 'Start with JavaScript Basics'}
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/tracks">Explore the tracks</Link>
          </Button>
        </m.div>
      </section>

      <ContinueCard />

      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="sr-only">
          Your stats
        </h2>
        <StatsRow />
      </section>

      <section aria-labelledby="tracks-title">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="tracks-title" className="font-heading text-2xl font-bold">
            Tracks
          </h2>
          <Link to="/tracks" className="text-sm font-medium text-link hover:underline">
            All tracks
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {TRACKS.map((track, i) => (
            <TrackCard key={track.id} track={track} index={i} />
          ))}
        </div>
      </section>

      <section aria-labelledby="courses-title">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 id="courses-title" className="font-heading text-2xl font-bold">
            Courses you can take now
          </h2>
          <Link to="/courses" className="text-sm font-medium text-link hover:underline">
            All courses
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
