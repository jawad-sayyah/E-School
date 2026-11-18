import { lazy, useState, type ReactNode } from 'react';
import { ClientOnly } from '@/components/ClientOnly';
import {
  BugIcon,
  CheckIcon,
  CircleCheckIcon,
  FlaskConicalIcon,
  LightbulbIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react';
import { metaAttrs } from '@/runner/checkTests';
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
import { fileName } from '@/components/react/specs';
import type { LiveTestResult } from '@/components/react/LiveTestExercise';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { getCodeBlocks, getProse } from './codeBlocks';
import { useLessonRef } from './LessonContext';
import { SandpackFallback } from './ReactPlayground';

const LiveTestExercise = lazy(() =>
  import('@/components/react/LiveTestExercise').then((m) => ({ default: m.LiveTestExercise })),
);

interface ReactTestExerciseProps {
  id: string;
  title: string;
  hints?: string[];
  /**
   * Prose plus fenced blocks, each with file=: ```jsx code (the component, read-only),
   * ```jsx starter (the student's test file), at least 3 ```jsx bug title="…" hint="…"
   * (a buggy version of a code file), and ```jsx solution (tests that catch every bug).
   */
  children?: ReactNode;
}

/** "Write the tests" for a React component: tests run in Sandpack against the real and buggy versions. */
export function ReactTestExercise({ id, title, hints = [], children }: ReactTestExerciseProps) {
  const lesson = useLessonRef();
  const key = `${lesson.course}/${lesson.lesson}/${id}`;
  const store = useProgressStore();
  const alreadyPassed = useProgress().exercises[key]?.passed ?? false;

  const blocks = getCodeBlocks(children);
  const has = (meta: string, word: string) => meta.split(/\s+/).includes(word);
  const codeFiles = Object.fromEntries(
    blocks.filter((b) => has(b.meta, 'code')).map((b) => [fileName(b), b.code]),
  );
  const starterBlock = blocks.find((b) => has(b.meta, 'starter'));
  const testFile = starterBlock ? fileName(starterBlock, '/App.test.js') : '/App.test.js';
  const starter = starterBlock?.code ?? '';
  const solution = blocks.find((b) => has(b.meta, 'solution'))?.code;
  const bugBlocks = blocks.filter((b) => has(b.meta, 'bug'));
  const bugs = bugBlocks.map((b) => ({ [fileName(b)]: b.code }));
  const bugInfo = bugBlocks.map((b, i) => {
    const attrs = metaAttrs(b.meta);
    return { title: attrs.title ?? `Bug ${i + 1}`, hint: attrs.hint };
  });
  const prose = getProse(children);

  const [tests, setTests] = useState(starter);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<LiveTestResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const correct = result?.correct;
  const correctOk = correct?.allPassed ?? false;
  const caughtCount = result?.caught.filter(Boolean).length ?? 0;
  const passedNow = correctOk && caughtCount === bugs.length;

  const onResult = (r: LiveTestResult) => {
    setResult(r);
    const ok = (r.correct?.allPassed ?? false) && r.caught.every(Boolean);
    if (ok) void store.saveExerciseResult(key, true);
  };

  const load = (next: string) => {
    setTests(next);
    setResult(null);
    setVersion((v) => v + 1);
  };

  const headingId = `exercise-${id}`;
  return (
    <Card
      className={cn('my-10 gap-0 py-0 transition-colors', passedNow && 'border-success/70')}
      aria-labelledby={headingId}
      data-question="react-test-exercise"
    >
      <CardHeader className="gap-2 border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-transparent bg-testing font-sans text-on-light">
            <FlaskConicalIcon aria-hidden />
            Write the tests
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
          data-toc={`Write the tests: ${title}`}
          className="scroll-mt-24 font-heading text-lg font-semibold"
        >
          {title}
        </h2>
        <div className="text-muted-foreground [&_p]:my-0">{prose}</div>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <div className="overflow-hidden rounded-xl border border-ed-line">
          <ClientOnly
            fallback={
              <SandpackFallback
                files={{ [testFile]: tests, ...codeFiles }}
                note="Loading the editor and the test runner…"
              />
            }
          >
            <LiveTestExercise
              codeFiles={codeFiles}
              bugs={bugs}
              testFile={testFile}
              tests={tests}
              version={version}
              onResult={onResult}
            />
          </ClientOnly>
        </div>
        <p className="text-xs text-faint">
          The test panel also runs your tests against hidden buggy copies (check-1, check-2…).
          There, a failing test is good news: it means your tests caught that bug.
        </p>

        <div className="rounded-lg border border-border">
          <p
            role="status"
            className={cn(
              'border-b border-border px-3.5 py-2 text-sm font-medium',
              passedNow ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {!result || !correct
              ? 'Edit the tests; they run automatically against every version.'
              : correct.broken
                ? `Your tests couldn't run: ${correct.broken}`
                : !correctOk
                  ? `Your tests fail on the correct component (${correct.failed} failing), so a test is wrong.`
                  : `Your tests caught ${caughtCount} of ${bugs.length} bugs`}
          </p>
          {result && correctOk && (
            <ul className="divide-y divide-border text-sm">
              {bugInfo.map((b, i) => {
                const caught = result.caught[i];
                return (
                  <li key={b.title} className="flex items-start gap-2 px-3.5 py-2">
                    {caught ? (
                      <CheckIcon
                        aria-label="caught"
                        className="mt-0.5 size-4 shrink-0 text-success"
                      />
                    ) : (
                      <XIcon
                        aria-label="missed"
                        className="mt-0.5 size-4 shrink-0 text-destructive"
                      />
                    )}
                    <BugIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
                    <span>
                      {caught === null ? 'Checking: ' : caught ? 'Caught: ' : 'Missed: '}
                      {b.title}
                      {caught === false && b.hint && (
                        <span className="block text-muted-foreground">
                          Hint: <TextWithCode text={b.hint} />
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {passedNow && (
          <p className="flex items-center gap-2 font-medium text-success">
            <CircleCheckIcon aria-hidden className="size-5" />
            Your tests caught every bug. That’s a good test suite!
          </p>
        )}

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
            Reset tests
          </Button>
          {solution && !showSolution && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Show example tests
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Show example tests?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Try the hints first: finding the checks that catch bugs is the skill this
                    exercise teaches.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep trying</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setShowSolution(true)}>
                    Show example tests
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {showSolution && solution && (
          <div>
            <p className="text-sm font-semibold">Example tests</p>
            <CodeBlock lang="jsx" meta={`file=${testFile.slice(1)}`} code={solution} />
            <Button variant="outline" size="sm" onClick={() => load(solution)}>
              Put them in the editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
