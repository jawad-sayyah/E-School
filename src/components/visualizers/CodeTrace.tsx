import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EditorFrame } from '@/editor/EditorFrame';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { outputUpTo } from './output';
import { CodeLines, ConsolePanel, PanelLabel, StepNote, Value } from './parts';
import { StepperControls } from './StepperControls';
import { useStepper } from './useStepper';

export interface TraceFrame {
  /** The line that just ran (1-based). */
  line: number;
  /** Variables and their values. A value like "#cart" points at a heap object. */
  vars?: Record<string, string>;
  /** Objects in memory, by id ("#cart" → "{ qty: 1 }"). */
  heap?: Record<string, string>;
  /** A console line printed at this step. */
  out?: string;
  /** What's happening, in one sentence. */
  note?: string;
}

const HEAP_COLORS = [
  'text-syn-fn border-syn-fn/60',
  'text-syn-kw border-syn-kw/60',
  'text-syn-num border-syn-num/60',
  'text-react border-react/60',
];

/**
 * Step through code one line at a time: the current line, every variable, objects in
 * memory (with arrows showing which variables share an object) and the console.
 */
export function CodeTrace({
  frames,
  file = 'trace.js',
  title,
  children,
}: {
  frames: TraceFrame[];
  file?: string;
  title?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const code = getCodeBlocks(children)[0]?.code ?? '';
  const stepper = useStepper(frames.length);
  const frame = frames[stepper.step];
  const prev = stepper.step > 0 ? frames[stepper.step - 1] : undefined;
  const heapIds = Object.keys(
    frames.reduce((all, f) => ({ ...all, ...f.heap }), {} as Record<string, string>),
  );
  const heapColor = (id: string) => HEAP_COLORS[heapIds.indexOf(id) % HEAP_COLORS.length];

  return (
    <figure className="my-6" aria-label={title ?? 'Step-by-step code trace'}>
      <EditorFrame
        file={file}
        lang="js"
        className="my-0"
        actions={<StepperControls stepper={stepper} count={frames.length} />}
      >
        <div className="grid bg-ed-bg md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <CodeLines code={code} current={frame?.line} />

          <div className="space-y-3 border-t border-ed-line p-3 font-mono text-[13px] md:border-t-0 md:border-l">
            <div>
              <PanelLabel>Variables</PanelLabel>
              <ul className="space-y-1">
                {Object.entries(frame?.vars ?? {}).map(([name, value]) => {
                  const changed = prev?.vars?.[name] !== value;
                  const ref = /^#\w+$/.test(value);
                  return (
                    <motion.li
                      key={name}
                      initial={reduce ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'flex items-center gap-2 rounded border border-ed-line px-2 py-1 transition-colors',
                        changed && 'border-js/60 bg-js/10',
                      )}
                    >
                      <span className="text-syn-prop">{name}</span>
                      <span className="text-ed-gutter">=</span>
                      {ref ? (
                        <span className={cn('rounded border px-1.5 text-xs', heapColor(value))}>
                          → {value}
                        </span>
                      ) : (
                        <Value text={value} />
                      )}
                    </motion.li>
                  );
                })}
                {Object.keys(frame?.vars ?? {}).length === 0 && (
                  <li className="text-ed-gutter italic">none yet</li>
                )}
              </ul>
            </div>

            {heapIds.length > 0 && (
              <div>
                <PanelLabel>Memory</PanelLabel>
                <ul className="space-y-1">
                  {Object.entries(frame?.heap ?? {}).map(([id, value]) => (
                    <li key={id} className={cn('rounded border px-2 py-1', heapColor(id))}>
                      <span className="text-xs">{id}</span>{' '}
                      <span className="text-con-text">
                        <Value text={value} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ConsolePanel lines={outputUpTo(frames, stepper.step)} />
          </div>
        </div>
        <StepNote step={stepper.step} note={frame?.note} />
      </EditorFrame>
    </figure>
  );
}
