import { lazy, Suspense, useState, type ReactNode } from 'react';
import {
  CheckIcon,
  CircleCheckIcon,
  LayoutTemplateIcon,
  LightbulbIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TextWithCode } from '@/components/InlineCode';
import { CodeView } from '@/components/questions/CodeView';
import { filesFrom, type SpecSummary } from '@/components/react/specs';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';
import { getCodeBlocks, getProse } from './codeBlocks';
import { useLessonRef } from './LessonContext';
import { SandpackFallback } from './ReactPlayground';

const LiveExercise = lazy(() =>
  import('@/components/react/LiveSandpack').then((m) => ({ default: m.LiveExercise })),
);
const LiveTarget = lazy(() =>
  import('@/components/react/LiveSandpack').then((m) => ({ default: m.LiveTarget })),
);

interface ReactExerciseProps {
  id: string;
  title: string;
  hints?: string[];
  /** "write" (default), "fix" (the starter is broken) or "build" (match a target preview). */
  variant?: 'write' | 'fix' | 'build';
  height?: number;
  /** Task prose plus fenced blocks marked `starter`, `tests` and `solution` (each with file=…). */
  children?: ReactNode;
}

const LABELS = { write: 'Your turn', fix: 'Fix the bug', build: 'Build the UI' } as const;

/**
 * A React exercise in Sandpack: the student edits real React code, sees the preview,
 * and hidden Testing Library tests check the result. "build" adds a target preview.
 */
export function ReactExercise({
  id,
  title,
  hints = [],
  variant = 'write',
  height,
  children,
}: ReactExerciseProps) {
  const lesson = useLessonRef();
  const key = `${lesson.course}/${lesson.lesson}/${id}`;
  const store = useProgressStore();
  const alreadyPassed = useProgress().exercises[key]?.passed ?? false;

  const blocks = getCodeBlocks(children);
  const starter = filesFrom(blocks, 'starter');
  const tests = filesFrom(blocks, 'tests');
  const solution = filesFrom(blocks, 'solution');
  const prose = getProse(children);

  const [files, setFiles] = useState(starter);
  const [version, setVersion] = useState(0);
  const [summary, setSummary] = useState<SpecSummary | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const label = LABELS[variant];
  const passedNow = summary?.allPassed ?? false;

  const onResult = (s: SpecSummary) => {
    setSummary(s);
    if (s.allPassed) void store.saveExerciseResult(key, true);
  };

  const load = (next: Record<string, string>) => {
    setFiles(next);
    setSummary(null);
    setVersion((v) => v + 1); // pushes the new files into the running sandbox
  };

  const headingId = `exercise-${id}`;
  return (
    <Card
      className={cn('my-10 gap-0 py-0 transition-colors', passedNow && 'border-success/70')}
      aria-labelledby={headingId}
      data-question={variant === 'build' ? 'build-ui' : 'react-exercise'}
    >
      <CardHeader className="gap-2 border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              'border-transparent font-sans text-on-light',
              variant === 'fix' ? 'bg-mistakes' : 'bg-react',
            )}
          >
            {variant === 'build' && <LayoutTemplateIcon aria-hidden />}
            {label}
          </Badge>
          {(alreadyPassed || passedNow) && (
            <Badge variant="outline" className="border-success/60 text-success">
              <CheckIcon aria-hidden />
              Completed
            </Badge>
          )}
        </div>
        <h2
          id={headingId}
          data-toc={`${label}: ${title}`}
          className="scroll-mt-24 font-heading text-lg font-semibold"
        >
          {title}
        </h2>
        <div className="text-muted-foreground [&_p]:my-0">{prose}</div>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        {variant === 'build' && (
          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-faint uppercase">
              Target: make yours look and work like this
            </p>
            <div className="overflow-hidden rounded-xl border border-ed-line">
              <Suspense fallback={<p className="p-4 text-sm text-faint">Loading the target…</p>}>
                <LiveTarget files={{ ...starter, ...solution }} />
              </Suspense>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-ed-line">
          <Suspense
            fallback={<SandpackFallback files={files} note="Loading the live editor and tests…" />}
          >
            <LiveExercise
              version={version}
              dependencyFiles={{ ...starter, ...solution }}
              files={files}
              hiddenFiles={tests}
              height={height}
              activeFile={Object.keys(files)[0]}
              onResult={onResult}
            />
          </Suspense>
        </div>

        <p
          role="status"
          className={cn(
            'flex items-center gap-2 text-sm',
            passedNow ? 'font-medium text-success' : 'text-muted-foreground',
          )}
        >
          {passedNow ? (
            <>
              <CircleCheckIcon aria-hidden className="size-5" />
              All {summary?.passed} tests pass. Nice work!
            </>
          ) : summary?.broken ? (
            `The tests couldn't run: ${summary.broken}`
          ) : summary ? (
            `${summary.passed} passed, ${summary.failed} failed. The test panel shows what's still wrong.`
          ) : (
            'Edit the code; the tests run automatically (or press the play button in the test panel).'
          )}
        </p>

        {hintsShown > 0 && (
          <ol className="space-y-2">
            {hints.slice(0, hintsShown).map((hint, i) => (
              <li key={i} className="flex gap-2 rounded-md bg-tip-bg px-3 py-2 text-sm text-tip">
                <LightbulbIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>Hint {i + 1}:</strong> <TextWithCode text={hint} />
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap gap-2">
          {hintsShown < hints.length && (
            <Button variant="outline" size="sm" onClick={() => setHintsShown((n) => n + 1)}>
              <LightbulbIcon aria-hidden />
              {hintsShown === 0 ? 'Show a hint' : 'Show another hint'} ({hintsShown + 1}/
              {hints.length})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => load(starter)}>
            <RotateCcwIcon aria-hidden />
            Reset code
          </Button>
          {!showSolution && Object.keys(solution).length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Show solution
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Show the solution?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You learn more by trying a hint first. You can still pass the exercise after
                    seeing the solution.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep trying</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setShowSolution(true)}>
                    Show solution
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {showSolution && (
          <div>
            <p className="text-sm font-semibold">Solution</p>
            {Object.entries(solution).map(([path, code]) => (
              <CodeView key={path} code={code} file={path.slice(1)} lang="jsx" />
            ))}
            <Button variant="outline" size="sm" onClick={() => load({ ...starter, ...solution })}>
              Put the solution in the editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** "Build the UI": a ReactExercise with the finished component shown as a target. */
export function BuildUI(props: Omit<ReactExerciseProps, 'variant'>) {
  return <ReactExercise {...props} variant="build" />;
}
