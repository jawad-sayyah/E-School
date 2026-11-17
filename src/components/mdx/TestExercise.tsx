import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BugIcon,
  CheckIcon,
  CircleCheckIcon,
  FlaskConicalIcon,
  LightbulbIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react';
import { checkTests, metaAttrs, type TestsCheck, type BugVariant } from '@/runner';
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
import { CodeEditor } from '@/editor/CodeEditor';
import { ConsoleView } from '@/editor/ConsoleView';
import { EditorButton } from '@/editor/EditorButton';
import { EditorFrame } from '@/editor/EditorFrame';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { findBlock, getCodeBlocks, getProse, metaFile } from './codeBlocks';
import { useLessonRef } from './LessonContext';

interface TestExerciseProps {
  id: string;
  title: string;
  hints?: string[];
  /**
   * Task prose plus fenced blocks: ```js code (the correct implementation, shown),
   * ```js starter (the tests the student starts from), at least 3 ```js bug title="…" hint="…"
   * (hidden buggy versions), and ```js solution (tests that catch every bug).
   */
  children?: ReactNode;
}

/** "Write the tests": the student's tests must pass on the real code and catch hidden bugs. */
export function TestExercise({ id, title, hints = [], children }: TestExerciseProps) {
  const lesson = useLessonRef();
  const key = `${lesson.course}/${lesson.lesson}/${id}`;
  const store = useProgressStore();
  const alreadyPassed = useProgress().exercises[key]?.passed ?? false;

  const blocks = getCodeBlocks(children);
  const codeBlock = findBlock(blocks, 'code');
  const code = codeBlock?.code ?? '';
  const codeFile = (codeBlock && metaFile(codeBlock.meta)) ?? 'code.js';
  const starter = findBlock(blocks, 'starter')?.code ?? '';
  const solution = findBlock(blocks, 'solution')?.code;
  const bugs: BugVariant[] = blocks
    .filter((b) => b.meta.split(/\s+/).includes('bug'))
    .map((b, i) => {
      const attrs = metaAttrs(b.meta);
      return { title: attrs.title ?? `Bug ${i + 1}`, hint: attrs.hint, code: b.code };
    });
  const prose = getProse(children);

  const [tests, setTests] = useState(starter);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<TestsCheck | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runChecks = async () => {
    if (checking) return;
    setChecking(true);
    const next = await checkTests(code, bugs, tests);
    if (!mounted.current) return;
    setResult(next);
    setChecking(false);
    if (next.passed) void store.saveExerciseResult(key, true);
  };

  const headingId = `exercise-${id}`;
  const passedNow = result?.passed ?? false;
  const correct = result?.correct;
  const summary = checking
    ? 'Running your tests against every version…'
    : result
      ? correct?.problem
        ? 'Your tests couldn’t run'
        : !correct?.passed
          ? 'Your tests fail on the correct code'
          : `Your tests caught ${result.caught} of ${result.bugs.length} bugs`
      : 'Press Check to run your tests';

  return (
    <Card
      className={cn('my-10 gap-0 py-0 transition-colors', passedNow && 'border-success/70')}
      aria-labelledby={headingId}
      data-question="test-exercise"
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
      <CardContent className="py-4">
        <p className="mb-1 text-xs font-semibold tracking-wide text-faint uppercase">
          The code under test
        </p>
        <CodeView code={code} file={codeFile} lang="js" />

        <EditorFrame
          file={codeFile.replace(/\.js$/, '.test.js')}
          lang="js"
          edited={tests !== starter}
          className="my-0 mt-4"
          actions={
            <>
              {tests !== starter && (
                <EditorButton
                  onClick={() => {
                    setTests(starter);
                    setResult(null);
                  }}
                >
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
          <CodeEditor
            value={tests}
            onChange={setTests}
            onRun={() => void runChecks()}
            label={`Your tests: ${title}`}
          />
          <div className="border-t border-ed-line bg-con-bg">
            <div className="flex h-8 items-center gap-2 border-b border-ed-bg px-3.5 text-[11px] font-semibold tracking-[0.06em] text-ed-gutter uppercase">
              Results
              <span
                aria-live="polite"
                className={cn(
                  'ml-auto font-medium tracking-normal normal-case',
                  result && (passedNow ? 'text-syn-str' : 'text-[#FF8A80]'),
                )}
              >
                {summary}
              </span>
            </div>
            {correct && (
              <ul className="py-1.5 font-mono text-[13px]">
                <ResultRow
                  ok={correct.passed}
                  text={
                    correct.problem
                      ? correct.problem
                      : correct.passed
                        ? `On the correct code: all ${correct.counts.passed} tests pass`
                        : `On the correct code: ${correct.counts.failed} test(s) fail, so a test is wrong`
                  }
                  detail={
                    !correct.passed
                      ? correct.results
                          .filter((r) => r.status === 'fail')
                          .map((r) => `${[...r.suite, r.name].join(' › ')}: ${r.message ?? ''}`)
                          .join('\n')
                      : undefined
                  }
                />
                {correct.passed &&
                  result?.bugs.map((b) => (
                    <ResultRow
                      key={b.title}
                      ok={b.caught}
                      icon={<BugIcon aria-hidden className="mt-0.5 size-4 shrink-0" />}
                      text={b.caught ? `Caught: ${b.title}` : `Missed: ${b.title}`}
                      detail={!b.caught && b.hint ? `Hint: ${b.hint}` : undefined}
                    />
                  ))}
              </ul>
            )}
          </div>
          {correct && correct.lines.length > 0 && (
            <ConsoleView lines={correct.lines} state="console.log output (correct code)" />
          )}
        </EditorFrame>

        {passedNow && (
          <p role="status" className="mt-4 flex items-center gap-2 font-medium text-success">
            <CircleCheckIcon aria-hidden className="size-5" />
            Your tests caught every bug. That’s a good test suite!
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
                  Show example tests
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Show example tests?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Try the hints first: finding the cases that catch bugs is the skill this
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
          <div className="mt-4">
            <p className="text-sm font-semibold">Example tests</p>
            <CodeBlock lang="js" meta="file=example.test.js" code={solution} />
            <Button variant="outline" size="sm" onClick={() => setTests(solution)}>
              Put them in the editor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultRow({
  ok,
  text,
  detail,
  icon,
}: {
  ok: boolean;
  text: string;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <li className="px-3.5 py-1.5">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckIcon aria-label="passed" className="mt-0.5 size-4 shrink-0 text-syn-str" />
        ) : (
          <XIcon aria-label="failed" className="mt-0.5 size-4 shrink-0 text-[#FF8A80]" />
        )}
        {icon && <span className={ok ? 'text-ed-gutter' : 'text-[#FF8A80]'}>{icon}</span>}
        <span className={ok ? 'text-con-text' : 'text-[#FF8A80]'}>
          <TextWithCode text={text} />
        </span>
      </div>
      {detail && (
        <div className="mt-1 ml-6 text-[12.5px] whitespace-pre-wrap text-ed-btn">
          <TextWithCode text={detail} />
        </div>
      )}
    </li>
  );
}
