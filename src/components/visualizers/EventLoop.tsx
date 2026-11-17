import type { ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { EditorFrame } from '@/editor/EditorFrame';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { outputUpTo } from './output';
import { CodeLines, ConsolePanel, PanelLabel, StepNote } from './parts';
import { StepperControls } from './StepperControls';
import { useStepper } from './useStepper';

export interface LoopFrame {
  /** The line being run, if any. */
  line?: number;
  /** Call stack, bottom first (the last item is the one running). */
  stack?: string[];
  /** Waiting in the browser: timers, network requests… */
  apis?: string[];
  /** Microtask queue (promise callbacks), first in line first. */
  micro?: string[];
  /** Task queue (timer and event callbacks), first in line first. */
  tasks?: string[];
  out?: string;
  note?: string;
}

const BOXES = [
  {
    key: 'stack',
    title: 'Call stack',
    tone: 'border-syn-fn/50',
    chip: 'border-syn-fn/70 bg-syn-fn/15 text-syn-fn',
  },
  {
    key: 'apis',
    title: 'Browser (timers, fetch)',
    tone: 'border-ed-btn/40',
    chip: 'border-ed-btn/60 bg-ed-hover text-ed-text',
  },
  {
    key: 'micro',
    title: 'Microtask queue',
    tone: 'border-syn-kw/50',
    chip: 'border-syn-kw/70 bg-syn-kw/15 text-syn-kw',
  },
  {
    key: 'tasks',
    title: 'Task queue',
    tone: 'border-syn-num/50',
    chip: 'border-syn-num/70 bg-syn-num/15 text-syn-num',
  },
] as const;

/**
 * The event loop, animated: each callback moves from the browser into a queue and onto
 * the call stack. Chips with the same label animate between boxes (shared layout).
 */
export function EventLoop({
  frames,
  file = 'event-loop.js',
  title,
  children,
}: {
  frames: LoopFrame[];
  file?: string;
  title?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const code = getCodeBlocks(children)[0]?.code ?? '';
  const stepper = useStepper(frames.length, 1600);
  const frame = frames[stepper.step] ?? {};

  return (
    <figure className="my-6" aria-label={title ?? 'The event loop, step by step'}>
      <EditorFrame
        file={file}
        lang="js"
        className="my-0"
        actions={<StepperControls stepper={stepper} count={frames.length} />}
      >
        <div className="grid bg-ed-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <CodeLines code={code} current={frame.line} />
          <div className="space-y-3 border-t border-ed-line p-3 lg:border-t-0 lg:border-l">
            <LayoutGroup>
              <div className="grid grid-cols-2 gap-2">
                {BOXES.map((box) => {
                  const items = [...((frame[box.key] as string[] | undefined) ?? [])];
                  if (box.key === 'stack') items.reverse(); // show the top of the stack first
                  return (
                    <div
                      key={box.key}
                      className={cn('min-h-24 rounded-lg border border-dashed p-2', box.tone)}
                      aria-label={`${box.title}: ${items.length ? items.join(', ') : 'empty'}`}
                    >
                      <PanelLabel>{box.title}</PanelLabel>
                      <ul className="flex flex-col gap-1">
                        <AnimatePresence initial={false}>
                          {items.map((item) => (
                            <motion.li
                              key={item}
                              layoutId={reduce ? undefined : `loop-${item}`}
                              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              className={cn(
                                'truncate rounded border px-2 py-0.5 font-mono text-xs',
                                box.chip,
                              )}
                            >
                              {item}
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    </div>
                  );
                })}
              </div>
            </LayoutGroup>
            <ConsolePanel lines={outputUpTo(frames, stepper.step)} />
          </div>
        </div>
        <StepNote step={stepper.step} note={frame.note} />
      </EditorFrame>
    </figure>
  );
}
