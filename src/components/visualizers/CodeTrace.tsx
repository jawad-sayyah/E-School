import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from 'lucide-react';
import { EditorFrame } from '@/editor/EditorFrame';
import { TOKEN_CLASS, VALUE_CLASS, tokenize, tokenizeValue } from '@/editor/highlight';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { TextWithCode } from '@/components/InlineCode';
import { cn } from '@/lib/utils';
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

function Value({ text }: { text: string }) {
  return (
    <>
      {tokenizeValue(text).map((p, i) => (
        <span key={i} className={VALUE_CLASS[p.kind]}>
          {p.text}
        </span>
      ))}
    </>
  );
}

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
  const lines = code.split('\n');
  const stepper = useStepper(frames.length);
  const frame = frames[stepper.step];
  const prev = stepper.step > 0 ? frames[stepper.step - 1] : undefined;
  const output = frames
    .slice(0, stepper.step + 1)
    .map((f) => f.out)
    .filter((o): o is string => o !== undefined);
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
          <ol className="py-2 font-mono text-[13.5px] leading-[23px]" aria-label="Code">
            {lines.map((line, i) => {
              const current = frame?.line === i + 1;
              return (
                <li
                  key={i}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'relative flex transition-colors duration-200',
                    current && 'bg-syn-fn/15',
                  )}
                >
                  <span className="w-10 shrink-0 pr-2 text-right text-ed-gutter select-none">
                    {current ? (
                      <ArrowRightIcon aria-hidden className="ml-auto inline size-3.5 text-syn-fn" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <code className="flex-1 overflow-x-auto px-3 whitespace-pre text-ed-text">
                    {tokenize(line).map((t, j) => (
                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                        {t.text}
                      </span>
                    ))}
                    {line === '' && ' '}
                  </code>
                </li>
              );
            })}
          </ol>

          <div className="space-y-3 border-t border-ed-line p-3 font-mono text-[13px] md:border-t-0 md:border-l">
            <div>
              <p className="mb-1.5 font-sans text-[10px] font-semibold tracking-[0.08em] text-ed-gutter uppercase">
                Variables
              </p>
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
                <p className="mb-1.5 font-sans text-[10px] font-semibold tracking-[0.08em] text-ed-gutter uppercase">
                  Memory
                </p>
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

            <div>
              <p className="mb-1.5 font-sans text-[10px] font-semibold tracking-[0.08em] text-ed-gutter uppercase">
                Console
              </p>
              <div className="min-h-7 rounded bg-con-bg px-2 py-1 text-con-text">
                {output.length === 0 ? (
                  <span className="text-ed-gutter italic">nothing yet</span>
                ) : (
                  output.map((o, i) => (
                    <div key={i}>
                      <span className="text-ed-gutter">› </span>
                      <Value text={o} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {frame?.note && (
            <motion.figcaption
              key={stepper.step}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="border-t border-ed-line bg-ed-tab px-4 py-2.5 font-sans text-sm text-ed-text"
              aria-live="polite"
            >
              <TextWithCode text={frame.note} />
            </motion.figcaption>
          )}
        </AnimatePresence>
      </EditorFrame>
    </figure>
  );
}
