import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CheckIcon,
  CircleCheckIcon,
  LightbulbIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react';
import { checkExercise, type ExerciseCheck, type TestResultMessage } from '@/runner';
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
import { CodeEditor } from '@/editor/CodeEditor';
import { ConsoleView } from '@/editor/ConsoleView';
import { EditorButton } from '@/editor/EditorButton';
import { EditorFrame } from '@/editor/EditorFrame';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { findBlock, getCodeBlocks, getProse } from './codeBlocks';
import { useLessonRef } from './LessonContext';

interface ExerciseProps {
  id: string;
  title: string;
  /** Up to 3 hints, revealed one at a time. */
  hints?: string[];
  /** The task (prose) plus ```js starter, ```js tests and ```js solution blocks. */
  children?: ReactNode;
}

function TestRow({ result }: { result: TestResultMessage }) {
  const name = [...result.suite, result.name].join(' › ');
  return (
    <li className="px-3.5 py-1.5">
      <div className="flex items-start gap-2">
        {result.status === 'pass' ? (
          <CheckIcon aria-label="passed" className="mt-0.5 size-4 shrink-0 text-syn-str" />
        ) : result.status === 'fail' ? (
          <XIcon aria-label="failed" className="mt-0.5 size-4 shrink-0 text-[#FF8A80]" />
        ) : (
          <span className="w-4 shrink-0 text-center text-ed-gutter">–</span>
        )}
        <span className={result.status === 'fail' ? 'text-[#FF8A80]' : 'text-con-text'}>
          {name}
        </span>
      </div>
      {result.status === 'fail' && (
        <div className="mt-1 ml-6 space-y-0.5 text-[12.5px]">
          {result.expected !== undefined ? (
            <>
              <div>
                <span className="text-ed-gutter">Expected: </span>
                <span className="text-syn-str">{result.expected}</span>
              </div>
              <div>
                <span className="text-ed-gutter">Received: </span>
                <span className="text-[#FF8A80]">{result.received}</span>
              </div>
            </>
          ) : (
            <div className="text-ed-btn">{result.message}</div>
          )}
        </div>
      )}
    </li>
  );
}

/** "Your turn": the student edits starter code and hidden tests check it in the worker. */
export function Exercise({ id, title, hints = [], children }: ExerciseProps) {
  const lesson = useLessonRef();
  const key = `${lesson.course}/${lesson.lesson}/${id}`;
  const store = useProgressStore();
  const alreadyPassed = useProgress().exercises[key]?.passed ?? false;

  const blocks = getCodeBlocks(children);
  const starter = findBlock(blocks, 'starter')?.code ?? '';
  const tests = findBlock(blocks, 'tests')?.code ?? '';
  const solution = findBlock(blocks, 'solution')?.code;
  const prose = getProse(children);

  const [code, setCode] = useState(starter);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<ExerciseCheck | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    // Set inside the effect: StrictMode mounts, unmounts and re-mounts in development.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runChecks = async () => {
    if (checking) return;
    setChecking(true);
    const result = await checkExercise(code, tests);
    if (!mounted.current) return;
    setCheck(result);
    setChecking(false);
    if (result.passed) void store.saveExerciseResult(key, true);
  };

  const headingId = `exercise-${id}`;
  const passedNow = check?.passed ?? false;
  const state = checking
    ? 'Running tests…'
    : check
      ? check.problem
        ? 'Could not run the tests'
        : `${check.counts.passed} passed${check.counts.failed ? `, ${check.counts.failed} failed` : ''}`
      : 'Press Check to run the tests';

  return (
    <Card
      className={cn('my-10 gap-0 py-0 transition-colors', passedNow && 'border-success/70')}
      aria-labelledby={headingId}
    >
      <CardHeader className="gap-2 border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-transparent bg-js font-sans text-on-light">Your turn</Badge>
          {(alreadyPassed || passedNow) && (
            <Badge variant="outline" className="border-success/60 text-success">
              <CheckIcon aria-hidden />
              Completed
            </Badge>
          )}
        </div>
        <h2
          id={headingId}
          data-toc={`Your turn: ${title}`}
          className="scroll-mt-24 font-heading text-lg font-semibold"
        >
          {title}
        </h2>
        <div className="text-muted-foreground [&_p]:my-0">{prose}</div>
      </CardHeader>
      <CardContent className="py-4">
        <EditorFrame
          file={`${id}.js`}
          lang="js"
          edited={code !== starter}
          className="my-0"
          actions={
            <>
              {code !== starter && (
                <EditorButton
                  onClick={() => {
                    setCode(starter);
                    setCheck(null);
                  }}
                >
                  <RotateCcwIcon aria-hidden />
                  Reset
                </EditorButton>
              )}
              <EditorButton
                tone="run"
                onClick={runChecks}
                disabled={checking}
                aria-label={`Check ${title}`}
              >
                <PlayIcon aria-hidden className="fill-current" />
                Check
              </EditorButton>
            </>
          }
        >
          <CodeEditor
            value={code}
            onChange={setCode}
            onRun={runChecks}
            label={`Exercise code: ${title}`}
          />
          <div className="border-t border-ed-line bg-con-bg">
            <div className="flex h-8 items-center gap-2 border-b border-ed-bg px-3.5 text-[11px] font-semibold tracking-[0.06em] text-ed-gutter uppercase">
              Tests
              <span
                aria-live="polite"
                className={cn(
                  'ml-auto font-medium tracking-normal normal-case',
                  check && !check.problem && (check.passed ? 'text-syn-str' : 'text-[#FF8A80]'),
                )}
              >
                {state}
              </span>
            </div>
            {check?.problem && (
              <p className="px-3.5 py-2.5 font-mono text-[13px] text-[#FF8A80]">{check.problem}</p>
            )}
            {check && check.results.length > 0 && (
              <ul className="py-1.5 font-mono text-[13px]">
                {check.results.map((r, i) => (
                  <TestRow key={i} result={r} />
                ))}
              </ul>
            )}
          </div>
          {check && check.lines.length > 0 && (
            <ConsoleView lines={check.lines} state="Your console.log output" />
          )}
        </EditorFrame>

        {passedNow && (
          <p role="status" className="mt-4 flex items-center gap-2 font-medium text-success">
            <CircleCheckIcon aria-hidden className="size-5" />
            All tests pass. Nice work!
          </p>
        )}

        {hintsShown > 0 && (
          <ol className="mt-4 space-y-2">
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

        <div className="mt-4 flex flex-wrap gap-2">
          {hintsShown < hints.length && (
            <Button variant="outline" size="sm" onClick={() => setHintsShown((n) => n + 1)}>
              <LightbulbIcon aria-hidden />
              {hintsShown === 0 ? 'Show a hint' : 'Show another hint'} ({hintsShown + 1}/
              {hints.length})
            </Button>
          )}
          {solution && !showSolution && (
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

        {showSolution && solution && (
          <div className="mt-4">
            <p className="text-sm font-semibold">Solution</p>
            <CodeBlock lang="js" meta="file=solution.js" code={solution} />
            <Button variant="outline" size="sm" onClick={() => setCode(solution)}>
              Put the solution in the editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
