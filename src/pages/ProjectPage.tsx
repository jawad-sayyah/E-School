import { Link } from 'react-router';
import {
  ArrowRightIcon,
  CloudUploadIcon,
  CompassIcon,
  FlaskConicalIcon,
  ListChecksIcon,
  ShoppingCartIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Crumbs } from '@/components/layout/Crumbs';
import { LessonList } from '@/components/LessonList';
import { COURSE_ACCENT, getCourse } from '@/content/courses';
import { getCourseLessons } from '@/content/lessons';
import { getTrack } from '@/content/tracks';
import { useProgress } from '@/progress/ProgressContext';
import { computeCourseProgress, lessonKey } from '@/progress/ProgressStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const PROJECT = 'minishop';

/** What every step page gives you (PROMPT.md §11). */
const STEP_PARTS = [
  {
    icon: CompassIcon,
    title: 'A goal and a preview',
    text: 'One sentence, and the finished result running live.',
  },
  {
    icon: ListChecksIcon,
    title: 'Tasks and hints',
    text: 'A checklist to tick off, with hints revealed one at a time.',
  },
  {
    icon: TerminalSquareIcon,
    title: 'Real code, checked',
    text: 'Starter code in a live editor; automated tests tell you when it works.',
  },
  {
    icon: FlaskConicalIcon,
    title: 'Test it',
    text: 'From step 3 on, write tests that catch hidden bugs in what you built.',
  },
];

/** /project: the "Build a real website with React" overview, with every MiniShop step. */
export function ProjectPage() {
  useDocumentTitle('Build MiniShop');
  const snapshot = useProgress();
  const course = getCourse(PROJECT);
  const track = getTrack('website');
  const lessons = getCourseLessons(PROJECT);
  const progress = computeCourseProgress(
    snapshot,
    PROJECT,
    lessons.map((l) => l.id),
  );
  const next =
    lessons.find((l) => !snapshot.lessons[lessonKey(PROJECT, l.id)]?.completed) ?? lessons[0];

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: 'Project' }]} />
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-xl bg-testing text-on-light"
        >
          <ShoppingCartIcon className="size-6" />
        </span>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Build MiniShop</h1>
      </div>
      <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
        {track?.description} The code you finish in one step is the starter code of the next, so by
        the end you have built a real shop, one piece at a time.
      </p>

      <div className="mb-10 rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {progress.completed} of {progress.total} steps complete
          </span>
          <span className="font-medium text-foreground">{progress.percent}%</span>
        </div>
        <Progress
          value={progress.percent}
          indicatorClassName={course ? COURSE_ACCENT[course.color] : undefined}
          className="h-2"
          aria-label="MiniShop progress"
        />
        <div className="mt-5 flex flex-wrap gap-2">
          {next && (
            <Button asChild>
              <Link to={`/courses/${PROJECT}/${next.id}`}>
                {progress.completed === 0 ? 'Start step 1' : 'Continue'}
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/tracks/website">Track and certificate</Link>
          </Button>
        </div>
      </div>

      <h2 className="mb-4 font-heading text-xl font-bold">Every step has</h2>
      <ul className="mb-10 grid gap-3 sm:grid-cols-2">
        {STEP_PARTS.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <Card className="h-full flex-row items-start gap-3 p-4">
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-testing" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <h2 className="mb-4 flex items-center gap-2 font-heading text-xl font-bold">
        <CloudUploadIcon aria-hidden className="size-5 text-testing" />
        The steps
      </h2>
      <LessonList courseId={PROJECT} lessons={lessons} />
    </main>
  );
}

export default ProjectPage;
