import { lazy, Suspense, useId, useState, type ReactNode } from 'react';
import { PlayIcon, RotateCcwIcon } from 'lucide-react';
import { RUNNER_MESSAGES } from '@/runner';
import { CodeEditor } from '@/editor/CodeEditor';
import { Problems } from '@/components/ts/Problems';
import type { EditorProblem } from '@/components/ts/TsEditor';
import { ConsoleView, expectedLines } from '@/editor/ConsoleView';
import { CopyButton } from '@/editor/CopyButton';
import { EditorButton } from '@/editor/EditorButton';
import { EditorFrame } from '@/editor/EditorFrame';
import { useRunner } from '@/editor/useRunner';
import { getCodeBlocks } from './codeBlocks';

const TsEditor = lazy(() => import('@/components/ts/TsEditor'));

interface TSPlaygroundProps {
  file?: string;
  /** Expected console output, shown before the first run. */
  expected?: string[] | string;
  /** Lines that are supposed to have type errors (the lesson is about the error). */
  errors?: number[];
  /** Only type-check: no Run button (e.g. TSX, or declarations with nothing to run). */
  checkOnly?: boolean;
  children?: ReactNode;
}

/** A TypeScript example in Monaco: live type errors, and Run compiles and executes it. */
export function TSPlayground({
  file = 'example.ts',
  expected,
  checkOnly = false,
  children,
}: TSPlaygroundProps) {
  const initial = getCodeBlocks(children)[0]?.code ?? '';
  const tsx = file.endsWith('.tsx');
  const name = `pg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [code, setCode] = useState(initial);
  const [problems, setProblems] = useState<EditorProblem[] | null>(null);
  const [compiling, setCompiling] = useState(false);
  const { lines, phase, run, reset } = useRunner();
  const edited = code !== initial;

  const runIt = async () => {
    if (checkOnly || compiling) return;
    setCompiling(true);
    try {
      const { getMonaco, checkWithMonaco } = await import('@/ts/monaco');
      const monaco = await getMonaco();
      const { js } = await checkWithMonaco(monaco, code, { tsx });
      run(js);
    } finally {
      setCompiling(false);
    }
  };

  const expectedOutput = expectedLines(expected);
  const shown =
    phase === 'idle'
      ? expectedOutput
      : phase === 'unavailable'
        ? [...expectedOutput, { level: 'muted' as const, text: RUNNER_MESSAGES.unavailable }]
        : lines;
  const hasErrors = (problems ?? []).some((p) => p.severity === 'error');

  return (
    <EditorFrame
      file={file}
      lang={tsx ? 'tsx' : 'ts'}
      edited={edited}
      actions={
        <>
          {edited && (
            <EditorButton
              onClick={() => {
                setCode(initial);
                reset();
              }}
            >
              <RotateCcwIcon aria-hidden />
              Reset
            </EditorButton>
          )}
          <CopyButton text={code} />
          {!checkOnly && (
            <EditorButton
              tone="run"
              onClick={() => void runIt()}
              disabled={phase === 'running' || compiling}
              aria-label={`Run ${file}`}
            >
              <PlayIcon aria-hidden className="fill-current" />
              Run
            </EditorButton>
          )}
        </>
      }
    >
      <Suspense
        fallback={
          <CodeEditor value={code} onChange={() => undefined} label={`Code: ${file}`} readOnly />
        }
      >
        <TsEditor
          name={name}
          value={code}
          onChange={setCode}
          tsx={tsx}
          label={`TypeScript editor: ${file}`}
          onRun={() => void runIt()}
          onProblems={setProblems}
        />
      </Suspense>
      <Problems problems={problems} />
      {!checkOnly && (
        <ConsoleView
          lines={
            phase !== 'idle' && hasErrors
              ? [
                  {
                    level: 'muted' as const,
                    text: 'Ran anyway: TypeScript only removes the types, so type errors don’t stop JavaScript from running.',
                  },
                  ...shown,
                ]
              : shown
          }
          state={
            phase === 'idle' || phase === 'unavailable'
              ? 'Expected output'
              : phase === 'running' || compiling
                ? 'Running…'
                : 'Output · just now'
          }
        />
      )}
    </EditorFrame>
  );
}
