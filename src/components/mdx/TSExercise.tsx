import { lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  CheckIcon,
  CircleCheckIcon,
  LightbulbIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react';
import { checkExercise, type ExerciseCheck } from '@/runner';
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
import { Problems } from '@/components/ts/Problems';
import type { EditorProblem } from '@/components/ts/TsEditor';
import { CodeEditor } from '@/editor/CodeEditor';
import { ConsoleView } from '@/editor/ConsoleView';
import { EditorButton } from '@/editor/EditorButton';
import { EditorFrame } from '@/editor/EditorFrame';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { describeTypeCheck, type TypeCheckFailure } from '@/ts/checks';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { findBlock, getCodeBlocks, getProse } from './codeBlocks';
import { useLessonRef } from './LessonContext';

const TsEditor = lazy(() => import('@/components/ts/TsEditor'));

interface TSExerciseProps {
  id: string;
  title: string;
  hints?: string[];
  variant?: 'write' | 'fix';
  /**
   * Task prose plus fenced blocks: ```ts starter, ```ts solution, and at least one of
   * ```ts types (hidden type-level checks, appended to the code) or ```js tests (run in the worker).
   * Use ```tsx blocks for React code (type-checked only).
   */
  children?: ReactNode;
}

interface TsResult {
  codeErrors: EditorProblem[];
  typeFailures: TypeCheckFailure[];
  run: ExerciseCheck | null;
  passed: boolean;
  problem?: string;
}

/** A TypeScript exercise: the code must type-check, satisfy the hidden type checks, and pass the tests. */
export function TSExercise({
  id,
  title,
  hints = [],
  variant = 'write',
  children,
}: TSExerciseProps) {
  const label = variant === 'fix' ? 'Fix the types' : 'Your turn';
  const lesson = useLessonRef();
  const key = `${lesson.course}/${lesson.lesson}/${id}`;
  const store = useProgressStore();
  const alreadyPassed = useProgress().exercises[key]?.passed ?? false;

  const blocks = getCodeBlocks(children);
  const starterBlock = findBlock(blocks, 'starter');
  const tsx = starterBlock?.lang === 'tsx';
  const starter = starterBlock?.code ?? '';
  const checks = findBlock(blocks, 'types')?.code ?? '';
  const tests = findBlock(blocks, 'tests')?.code ?? '';
  const solution = findBlock(blocks, 'solution')?.code;
  const prose = getProse(children);
  const file = `${id}.${tsx ? 'tsx' : 'ts'}`;
  const name = `ex-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const [code, setCode] = useState(starter);
  const [version, setVersion] = useState(0);
  const [problems, setProblems] = useState<EditorProblem[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<TsResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = (next: string) => {
    setCode(next);
    setResult(null);
    setVersion((v) => v + 1);
  };

  const runChecks = async () => {
    if (checking) return;
    setChecking(true);
    let next: TsResult;
    try {
      const { getMonaco, checkWithMonaco } = await import('@/ts/monaco');
      const monaco = await getMonaco();
      const { diagnostics, js } = await checkWithMonaco(monaco, code, { checks, tsx });
      const codeErrors = diagnostics
        .filter((d) => d.source === 'code')
        .map((d) => ({
          line: d.line,
          column: d.column,
          message: d.message,
          severity: 'error' as const,
        }));
      const typeFailures = diagnostics
        .filter((d) => d.source === 'checks')
        .map((d) => describeTypeCheck(checks, d));
      const run = tests && !tsx ? await checkExercise(js, tests) : null;
      const typesOk = codeErrors.length === 0 && typeFailures.length === 0;
      next = { codeErrors, typeFailures, run, passed: typesOk && (run ? run.passed : true) };
    } catch {
      next = {
        codeErrors: [],
        typeFailures: [],
        run: null,
        passed: false,
        problem: 'The TypeScript checker couldn’t load. Check your connection and try again.',
      };
    }
    if (!mounted.current) return;
    setResult(next);
    setChecking(false);
    if (next.passed) void store.saveExerciseResult(key, true);
  };

  const headingId = `exercise-${id}`;
  const passedNow = result?.passed ?? false;
  const typeCheckCount = (checks.match(/^\s*\/\/ @ts-expect-error/gm) ?? []).length;
  const summary = checking
    ? 'Checking…'
    : result
      ? result.problem
        ? 'Couldn’t check'
        : result.passed
          ? 'All checks pass'
          : [
              result.codeErrors.length && `${result.codeErrors.length} type error(s)`,
              result.typeFailures.length && `${result.typeFailures.length} type check(s) failed`,
              result.run &&
                result.run.counts.failed &&
                `${result.run.counts.failed} test(s) failed`,
              result.run?.problem && 'tests couldn’t run',
            ]
              .filter(Boolean)
              .join(', ')
      : 'Press Check to type-check your code and run the tests';

  return (
    <Card
      className={cn('my-10 gap-0 py-0 transition-colors', passedNow && 'border-success/70')}
      aria-labelledby={headingId}
      data-question="ts-exercise"
    >
      <CardHeader className="gap-2 border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              'border-transparent font-sans',
              variant === 'fix' ? 'bg-mistakes text-on-light' : 'bg-ts text-on-dark',
            )}
          >
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
      <CardContent className="py-4">
        <EditorFrame
          file={file}
          lang={tsx ? 'tsx' : 'ts'}
          edited={code !== starter}
          className="my-0"
          actions={
            <>
              {code !== starter && (
                <EditorButton onClick={() => load(starter)}>
                  <RotateCcwIcon aria-hidden />
                  Reset
                </EditorButton>
              )}
              <EditorButton
                tone="run"
                onClick={() => void runChecks()}
                disabled={checking}
                aria-label={`Check ${title}`}
              >
                <PlayIcon aria-hidden className="fill-current" />
                Check
              </EditorButton>
            </>
          }
        >
          <Suspense
            fallback={
              <CodeEditor
                value={code}
                onChange={() => undefined}
                label={`Code: ${file}`}
                readOnly
              />
            }
          >
            <TsEditor
              key={version}
              name={name}
              value={code}
              onChange={setCode}
              tsx={tsx}
              label={`Exercise code: ${title}`}
              onRun={() => void runChecks()}
              onProblems={setProblems}
            />
          </Suspense>
          <Problems problems={problems} />
          <div className="border-t border-ed-line bg-con-bg">
            <div className="flex h-8 items-center gap-2 border-b border-ed-bg px-3.5 text-[11px] font-semibold tracking-[0.06em] text-ed-gutter uppercase">
              Checks
              {typeCheckCount > 0 && (
                <span className="font-medium tracking-normal normal-case">
                  · {typeCheckCount} hidden type check{typeCheckCount === 1 ? '' : 's'}
                </span>
              )}
              <span
                aria-live="polite"
                className={cn(
                  'ml-auto font-medium tracking-normal normal-case',
                  result && !result.problem && (result.passed ? 'text-syn-str' : 'text-[#FF8A80]'),
                )}
              >
                {summary}
              </span>
            </div>
            {result?.problem && (
              <p className="px-3.5 py-2.5 font-mono text-[13px] text-[#FF8A80]">{result.problem}</p>
            )}
            {result && !result.problem && (
              <ul className="py-1.5 font-mono text-[13px]">
                {result.codeErrors.length > 0 && (
                  <CheckRow ok={false} text="Your code has type errors (see Problems above)" />
                )}
                {result.codeErrors.length === 0 && <CheckRow ok text="Your code type-checks" />}
                {result.typeFailures.map((f, i) => (
                  <CheckRow key={i} ok={false} text={f.title} detail={f.detail} />
                ))}
                {checks && result.typeFailures.length === 0 && result.codeErrors.length === 0 && (
                  <CheckRow ok text="Every hidden type check holds" />
                )}
                {result.run?.problem && <CheckRow ok={false} text={result.run.problem} />}
                {result.run?.results.map((r, i) => (
                  <CheckRow
                    key={`t${i}`}
                    ok={r.status === 'pass'}
                    text={[...r.suite, r.name].join(' › ')}
                    detail={
                      r.status === 'fail'
                        ? r.expected !== undefined
                          ? `Expected ${r.expected}, received ${r.received}`
                          : r.message
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </div>
          {result?.run && result.run.lines.length > 0 && (
            <ConsoleView lines={result.run.lines} state="Your console.log output" />
          )}
        </EditorFrame>

        {passedNow && (
          <p role="status" className="mt-4 flex items-center gap-2 font-medium text-success">
            <CircleCheckIcon aria-hidden className="size-5" />
            Everything checks out. Nice work!
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
            <CodeBlock
              lang={tsx ? 'tsx' : 'ts'}
              meta={`file=solution.${tsx ? 'tsx' : 'ts'}`}
              code={solution}
            />
            <Button variant="outline" size="sm" onClick={() => load(solution)}>
              Put the solution in the editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckRow({ ok, text, detail }: { ok: boolean; text: string; detail?: string }) {
  return (
    <li className="px-3.5 py-1.5">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckIcon aria-label="passed" className="mt-0.5 size-4 shrink-0 text-syn-str" />
        ) : (
          <XIcon aria-label="failed" className="mt-0.5 size-4 shrink-0 text-[#FF8A80]" />
        )}
        <span className={ok ? 'text-con-text' : 'text-[#FF8A80]'}>
          <TextWithCode text={text} />
        </span>
      </div>
      {detail && <div className="mt-1 ml-6 text-[12.5px] text-ed-btn">{detail}</div>}
    </li>
  );
}
