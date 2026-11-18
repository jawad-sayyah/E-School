import { lazy, useState, type ReactNode } from 'react';
import { ClientOnly } from '@/components/ClientOnly';
import { Link } from 'react-router';
import { BookOpenIcon, EyeIcon, ListTodoIcon, TargetIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TextWithCode } from '@/components/InlineCode';
import { filesFrom } from '@/components/react/specs';
import { useHydrated } from '@/hooks/useHydrated';
import { cn } from '@/lib/utils';
import { getCodeBlocks } from './codeBlocks';
import { useLessonRef } from './LessonContext';
import { ReactExercise } from './ReactExercise';

const LiveTarget = lazy(() =>
  import('@/components/react/LiveSandpack').then((m) => ({ default: m.LiveTarget })),
);

/** [label, link] pairs pointing back to the lessons a step practices. */
export type PracticeLink = [label: string, href: string];

interface StepIntroProps {
  /** One sentence: what the student will have built by the end of the step. */
  goal: string;
  practice?: PracticeLink[];
  /** The checklist the student ticks off (ticks are remembered in this browser). */
  tasks: string[];
  /** The finished step's files, shown on demand as a live preview. */
  previewFiles?: Record<string, string>;
}

function readTicks(key: string): boolean[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Boolean) : [];
  } catch {
    return [];
  }
}

function writeTicks(key: string, ticks: boolean[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ticks));
  } catch {
    // Private mode or storage full: the checklist still works for this visit.
  }
}

/** The top of a MiniShop step: the goal (with a preview of the result), what it practices, and the task list. */
export function StepIntro({ goal, practice = [], tasks, previewFiles }: StepIntroProps) {
  const lesson = useLessonRef();
  const storageKey = `e-school:tasks:${lesson.course}/${lesson.lesson}`;
  const hydrated = useHydrated();
  // Saved ticks are read once the page is hydrated (the prerendered HTML shows none).
  const [picked, setTicks] = useState<boolean[] | null>(null);
  const ticks = picked ?? (hydrated ? readTicks(storageKey) : []);
  const [showPreview, setShowPreview] = useState(false);
  const done = tasks.filter((_, i) => ticks[i]).length;

  const toggle = (i: number, value: boolean) => {
    const next = tasks.map((_, j) => (j === i ? value : Boolean(ticks[j])));
    setTicks(next);
    writeTicks(storageKey, next);
  };

  return (
    <section aria-label="Step overview" className="my-8 space-y-5" data-step-intro>
      <Card className="gap-3 p-5">
        <h2
          id="goal"
          data-toc="Goal"
          className="flex scroll-mt-24 items-center gap-2 font-heading text-lg font-semibold"
        >
          <TargetIcon aria-hidden className="size-5 text-testing" />
          Goal
        </h2>
        <p className="text-foreground">
          <TextWithCode text={goal} />
        </p>
        {previewFiles && (
          <div>
            {showPreview ? (
              <div className="overflow-hidden rounded-xl border border-ed-line">
                <p className="border-b border-ed-line px-3 py-1.5 text-xs font-semibold tracking-wide text-faint uppercase">
                  The finished step
                </p>
                <ClientOnly
                  fallback={<p className="p-4 text-sm text-faint">Loading the preview…</p>}
                >
                  <LiveTarget files={previewFiles} />
                </ClientOnly>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                <EyeIcon aria-hidden />
                Preview the finished result
              </Button>
            )}
          </div>
        )}
      </Card>

      {practice.length > 0 && (
        <div>
          <h2
            id="what-you-ll-practice"
            data-toc="What you'll practice"
            className="mb-2 flex scroll-mt-24 items-center gap-2 font-heading text-lg font-semibold"
          >
            <BookOpenIcon aria-hidden className="size-5 text-testing" />
            What you'll practice
          </h2>
          <ul className="flex flex-wrap gap-2">
            {practice.map(([label, href]) => (
              <li key={href}>
                <Link
                  to={href}
                  className="inline-flex rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-testing hover:text-foreground"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2
          id="tasks"
          data-toc="Tasks"
          className="mb-2 flex scroll-mt-24 items-center gap-2 font-heading text-lg font-semibold"
        >
          <ListTodoIcon aria-hidden className="size-5 text-testing" />
          Tasks
          <span className="ml-auto text-sm font-normal text-muted-foreground" aria-live="polite">
            {done} of {tasks.length} done
          </span>
        </h2>
        <ul className="space-y-2">
          {tasks.map((task, i) => {
            const id = `task-${i}`;
            return (
              <li
                key={i}
                className={cn(
                  'flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors',
                  ticks[i] && 'border-success/50 bg-success/5',
                )}
              >
                <Checkbox
                  id={id}
                  checked={Boolean(ticks[i])}
                  onCheckedChange={(value) => toggle(i, value === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={id}
                  className={cn(
                    'cursor-pointer text-sm',
                    ticks[i] ? 'text-muted-foreground line-through' : 'text-foreground',
                  )}
                >
                  <TextWithCode text={task} />
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

interface ProjectStepProps extends Omit<StepIntroProps, 'previewFiles'> {
  id: string;
  title: string;
  hints?: string[];
  /** Notes on the key lines of the solution, shown with it. */
  explain?: string[];
  height?: number;
  /** Task prose plus ```starter, ```tests and ```solution blocks, as in <ReactExercise>. */
  children?: ReactNode;
}

/**
 * One MiniShop step (PROMPT.md §11): goal + preview, what it practices, the task list,
 * then the starter code in Sandpack with hints, automated checks and the solution.
 */
export function ProjectStep({ goal, practice, tasks, children, ...exercise }: ProjectStepProps) {
  const blocks = getCodeBlocks(children);
  const previewFiles = { ...filesFrom(blocks, 'starter'), ...filesFrom(blocks, 'solution') };
  return (
    <>
      <StepIntro goal={goal} practice={practice} tasks={tasks} previewFiles={previewFiles} />
      <ReactExercise {...exercise}>{children}</ReactExercise>
    </>
  );
}
