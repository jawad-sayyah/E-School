import { useState, type ReactNode } from 'react';
import { PlayIcon, RotateCcwIcon } from 'lucide-react';
import type { FetchMocks } from '@/runner';
import { RUNNER_MESSAGES } from '@/runner';
import { CodeEditor } from '@/editor/CodeEditor';
import { ConsoleView, expectedLines } from '@/editor/ConsoleView';
import { CopyButton } from '@/editor/CopyButton';
import { EditorButton } from '@/editor/EditorButton';
import { EditorFrame } from '@/editor/EditorFrame';
import { useRunner } from '@/editor/useRunner';
import { getCodeBlocks } from './codeBlocks';

interface PlaygroundProps {
  file?: string;
  lang?: string;
  /** Expected console output, shown before the first run. */
  expected?: string[] | string;
  /** Code that needs a real web page (DOM, import/export): no Run button. */
  browserOnly?: boolean;
  fetchMocks?: FetchMocks;
  fetchDelay?: number;
  children?: ReactNode;
}

/** A runnable JavaScript example. The code comes from the fenced block inside it. */
export function Playground({
  file = 'example.js',
  lang = 'js',
  expected,
  browserOnly = false,
  fetchMocks,
  fetchDelay,
  children,
}: PlaygroundProps) {
  const initial = getCodeBlocks(children)[0]?.code ?? '';
  const [code, setCode] = useState(initial);
  const { lines, phase, run, reset } = useRunner({ fetchMocks, fetchDelay });
  const edited = code !== initial;

  const expectedOutput = expectedLines(expected);
  const shown =
    phase === 'idle'
      ? expectedOutput
      : phase === 'unavailable'
        ? [...expectedOutput, { level: 'muted' as const, text: RUNNER_MESSAGES.unavailable }]
        : lines;
  const state = browserOnly
    ? 'What you’d see in the browser'
    : phase === 'idle' || phase === 'unavailable'
      ? 'Expected output'
      : phase === 'running'
        ? 'Running…'
        : 'Output · just now';

  const runIt = () => {
    if (!browserOnly) run(code);
  };

  return (
    <EditorFrame
      file={file}
      lang={lang}
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
          {browserOnly ? (
            <span className="px-2 text-xs font-medium text-ed-gutter">Runs in a browser page</span>
          ) : (
            <EditorButton
              tone="run"
              onClick={runIt}
              disabled={phase === 'running'}
              aria-label={`Run ${file}`}
            >
              <PlayIcon aria-hidden className="fill-current" />
              Run
            </EditorButton>
          )}
        </>
      }
    >
      <CodeEditor value={code} onChange={setCode} onRun={runIt} label={`Code editor: ${file}`} />
      <ConsoleView lines={shown} state={state} />
    </EditorFrame>
  );
}
