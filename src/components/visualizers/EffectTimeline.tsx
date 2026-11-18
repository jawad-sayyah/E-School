import type { ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { EditorFrame } from '@/editor/EditorFrame';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { TextWithCode } from '@/components/InlineCode';
import { cn } from '@/lib/utils';
import { outputUpTo } from './output';
import { CodeLines, ConsolePanel, PanelLabel, StepNote } from './parts';
import { StepperControls } from './StepperControls';
import { useStepper } from './useStepper';

export type EffectStage = 'render' | 'commit' | 'paint' | 'cleanup' | 'effect' | 'unmount';

export interface DepCheck {
  name: string;
  /** The value in the previous render (leave out on the first render). */
  prev?: string;
  next: string;
}

export interface EffectFrame {
  line?: number;
  /** The stage happening in this step. */
  stage?: EffectStage;
  /** One new entry for the timeline. */
  log?: string;
  /** React's dependency check for this render. */
  deps?: DepCheck[];
  screen?: string;
  out?: string;
  note?: string;
}

const STAGES: { key: EffectStage; title: string; help: string; cls: string }[] = [
  {
    key: 'render',
    title: 'Render',
    help: 'Your function runs',
    cls: 'border-syn-fn bg-syn-fn/15 text-syn-fn',
  },
  {
    key: 'commit',
    title: 'Commit',
    help: 'DOM updated',
    cls: 'border-react bg-react/15 text-react',
  },
  {
    key: 'paint',
    title: 'Paint',
    help: 'User sees it',
    cls: 'border-syn-str bg-syn-str/15 text-syn-str',
  },
  {
    key: 'cleanup',
    title: 'Cleanup',
    help: 'Old effect undone',
    cls: 'border-syn-num bg-syn-num/15 text-syn-num',
  },
  {
    key: 'effect',
    title: 'Effect',
    help: 'New effect runs',
    cls: 'border-syn-kw bg-syn-kw/15 text-syn-kw',
  },
];

const DOT: Record<EffectStage, string> = {
  render: 'bg-syn-fn',
  commit: 'bg-react',
  paint: 'bg-syn-str',
  cleanup: 'bg-syn-num',
  effect: 'bg-syn-kw',
  unmount: 'bg-syn-tag',
};

/** The useEffect timeline: when effects and cleanups run relative to render, commit and paint. */
export function EffectTimeline({
  frames,
  file = 'App.jsx',
  title,
  children,
}: {
  frames: EffectFrame[];
  file?: string;
  title?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const code = getCodeBlocks(children)[0]?.code;
  const stepper = useStepper(frames.length, 1600);
  const frame = frames[stepper.step];
  const timeline = frames
    .slice(0, stepper.step + 1)
    .filter((f) => f.log)
    .map((f) => ({ log: f.log as string, stage: f.stage ?? 'render' }));

  return (
    <figure className="my-6" aria-label={title ?? 'The useEffect timeline, step by step'}>
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
            <ol className="grid grid-cols-5 gap-1" aria-label="Stages">
              {STAGES.map((s) => {
                const active =
                  frame?.stage === s.key || (frame?.stage === 'unmount' && s.key === 'cleanup');
                return (
                  <li
                    key={s.key}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'rounded-lg border px-1 py-1.5 text-center transition-colors duration-300',
                      active ? s.cls : 'border-ed-line text-ed-gutter',
                    )}
                  >
                    <span className="block text-[11px] font-semibold">{s.title}</span>
                    <span className="block text-[9.5px] leading-tight opacity-80">{s.help}</span>
                  </li>
                );
              })}
            </ol>

            {frame?.deps && (
              <div>
                <PanelLabel>Dependency check</PanelLabel>
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-left text-ed-gutter">
                      <th className="py-0.5 font-normal">dep</th>
                      <th className="font-normal">before</th>
                      <th className="font-normal">now</th>
                      <th className="font-normal">changed?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frame.deps.map((d) => {
                      const first = d.prev === undefined;
                      const changed = first || d.prev !== d.next;
                      return (
                        <tr key={d.name} className="text-ed-text">
                          <td className="py-0.5">{d.name}</td>
                          <td className="text-ed-gutter">{first ? '—' : d.prev}</td>
                          <td>{d.next}</td>
                          <td className={changed ? 'text-syn-kw' : 'text-ed-gutter'}>
                            {first ? 'first run' : changed ? 'yes → run' : 'no → skip'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <PanelLabel>Timeline</PanelLabel>
              <ol className="space-y-1" aria-label="What has happened so far">
                <AnimatePresence initial={false}>
                  {timeline.map((t, i) => (
                    <m.li
                      key={`${i}-${t.log}`}
                      initial={reduce ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 text-xs text-ed-text"
                    >
                      <span
                        aria-hidden
                        className={cn('size-2 shrink-0 rounded-full', DOT[t.stage])}
                      />
                      <TextWithCode text={t.log} />
                    </m.li>
                  ))}
                </AnimatePresence>
                {timeline.length === 0 && (
                  <li className="text-xs text-ed-gutter italic">nothing yet</li>
                )}
              </ol>
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
