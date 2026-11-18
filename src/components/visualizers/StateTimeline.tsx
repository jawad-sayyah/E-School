import type { ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { LockIcon } from 'lucide-react';
import { EditorFrame } from '@/editor/EditorFrame';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { outputUpTo } from './output';
import { CodeLines, ConsolePanel, PanelLabel, StepNote, Value } from './parts';
import { StepperControls } from './StepperControls';
import { useStepper } from './useStepper';

export interface QueuedUpdate {
  /** How the update was requested, e.g. "setQty(qty + 1)" or "q => q + 1". */
  update: string;
  /** What it produces when React processes the queue, e.g. "1 + 1 = 2". */
  result?: string;
}

export interface StateFrame {
  line?: number;
  /** Which render the code is in (1 = the first render). */
  render: number;
  /** The state values this render sees. They never change during this render or its handlers. */
  snapshot: Record<string, string>;
  /** Updates waiting for the next render, in order. */
  queue?: QueuedUpdate[];
  /** What the user sees. */
  screen?: string;
  out?: string;
  note?: string;
}

/**
 * "State is a snapshot": the values a render sees stay fixed, set calls only queue
 * updates, and the next render gets the result of processing the queue in order.
 */
export function StateTimeline({
  frames,
  file = 'App.jsx',
  title,
  children,
}: {
  frames: StateFrame[];
  file?: string;
  title?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const code = getCodeBlocks(children)[0]?.code;
  const stepper = useStepper(frames.length, 1700);
  const frame = frames[stepper.step];
  const queue = frame?.queue ?? [];

  return (
    <figure className="my-6" aria-label={title ?? 'How a state update flows, step by step'}>
      <EditorFrame
        file={file}
        lang="jsx"
        className="my-0"
        actions={<StepperControls stepper={stepper} count={frames.length} />}
      >
        <div
          className={cn(
            'grid grid-cols-1 bg-ed-bg',
            code && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
          )}
        >
          {code && <CodeLines code={code} current={frame?.line} />}
          <div className="space-y-3 border-t border-ed-line p-3 lg:border-t-0 lg:border-l">
            <div className="grid gap-2 sm:grid-cols-2">
              <div
                className="rounded-lg border border-dashed border-syn-fn/50 p-2"
                aria-label={`Render ${frame?.render} sees: ${Object.entries(frame?.snapshot ?? {})
                  .map(([k, v]) => `${k} = ${v}`)
                  .join(', ')}`}
              >
                <PanelLabel>
                  <span className="inline-flex items-center gap-1">
                    <LockIcon aria-hidden className="size-3" />
                    Render #{frame?.render}: snapshot
                  </span>
                </PanelLabel>
                <ul className="space-y-1 font-mono text-xs">
                  {Object.entries(frame?.snapshot ?? {}).map(([name, value]) => (
                    <li
                      key={name}
                      className="flex items-center gap-2 rounded border border-syn-fn/40 bg-syn-fn/10 px-2 py-0.5"
                    >
                      <span className="text-ed-text">{name}</span>
                      <span className="text-ed-gutter">=</span>
                      <m.span
                        key={`${frame?.render}-${value}`}
                        initial={reduce ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Value text={value} />
                      </m.span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="rounded-lg border border-dashed border-syn-kw/50 p-2"
                aria-label={`Update queue: ${queue.length ? queue.map((q) => q.update).join(', ') : 'empty'}`}
              >
                <PanelLabel>Update queue (for the next render)</PanelLabel>
                <ol className="space-y-1">
                  <AnimatePresence initial={false}>
                    {queue.map((q, i) => (
                      <m.li
                        key={`${i}-${q.update}`}
                        initial={reduce ? false : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? undefined : { opacity: 0 }}
                        className="rounded border border-syn-kw/60 bg-syn-kw/10 px-2 py-0.5 font-mono text-xs text-syn-kw"
                      >
                        <span className="text-ed-gutter">{i + 1}. </span>
                        {q.update}
                        {q.result && <span className="text-ed-text"> → {q.result}</span>}
                      </m.li>
                    ))}
                  </AnimatePresence>
                  {queue.length === 0 && <li className="text-xs text-ed-gutter italic">empty</li>}
                </ol>
              </div>
            </div>

            {frame?.screen !== undefined && (
              <div>
                <PanelLabel>On screen</PanelLabel>
                <div className="rounded-lg border border-ed-line bg-white px-3 py-2 font-sans text-sm text-[#171a2b]">
                  {frame.screen}
                </div>
              </div>
            )}
            {frames.some((f) => f.out !== undefined) && (
              <ConsolePanel lines={outputUpTo(frames, stepper.step)} />
            )}
          </div>
        </div>
        <StepNote step={stepper.step} note={frame?.note} />
      </EditorFrame>
    </figure>
  );
}
