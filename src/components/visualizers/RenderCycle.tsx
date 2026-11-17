import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EditorFrame } from '@/editor/EditorFrame';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { TextWithCode } from '@/components/InlineCode';
import { cn } from '@/lib/utils';
import { CodeLines, PanelLabel, StepNote } from './parts';
import { StepperControls } from './StepperControls';
import { useStepper } from './useStepper';

export type RenderPhase = 'idle' | 'trigger' | 'render' | 'commit';

export interface TreeNode {
  name: string;
  /** Nesting depth in the component tree (0 = root). */
  depth: number;
  /** The component's state or props worth showing, e.g. "count = 1". */
  state?: string;
  /** What happens to it in this step. */
  status?: 'rendering' | 'rendered' | 'skipped' | 'updated';
}

export interface RenderFrame {
  phase: RenderPhase;
  tree: TreeNode[];
  /** What the user sees on screen after this step. */
  screen?: string;
  line?: number;
  note?: string;
}

const PHASES: { key: RenderPhase; title: string; help: string }[] = [
  { key: 'trigger', title: 'Trigger', help: 'Something asks for an update' },
  { key: 'render', title: 'Render', help: 'React calls your components' },
  { key: 'commit', title: 'Commit', help: 'React updates the DOM' },
];

const STATUS: Record<NonNullable<TreeNode['status']>, { label: string; cls: string }> = {
  rendering: { label: 'rendering…', cls: 'border-syn-fn bg-syn-fn/20 text-syn-fn' },
  rendered: { label: 'rendered', cls: 'border-syn-fn/60 bg-syn-fn/10 text-ed-text' },
  skipped: { label: 'skipped', cls: 'border-ed-line text-ed-gutter' },
  updated: { label: 'DOM updated', cls: 'border-syn-str/70 bg-syn-str/10 text-syn-str' },
};

/** React's render cycle, step by step: trigger → render → commit, over the component tree. */
export function RenderCycle({
  frames,
  file = 'App.jsx',
  title,
  children,
}: {
  frames: RenderFrame[];
  file?: string;
  title?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const code = getCodeBlocks(children)[0]?.code;
  const stepper = useStepper(frames.length, 1600);
  const frame = frames[stepper.step];

  return (
    <figure className="my-6" aria-label={title ?? 'The React render cycle, step by step'}>
      <EditorFrame
        file={file}
        lang="jsx"
        className="my-0"
        actions={<StepperControls stepper={stepper} count={frames.length} />}
      >
        <div className={cn('grid bg-ed-bg', code && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
          {code && <CodeLines code={code} current={frame?.line} />}
          <div className="space-y-3 border-t border-ed-line p-3 lg:border-t-0 lg:border-l">
            <ol className="grid grid-cols-3 gap-1.5" aria-label="Phases">
              {PHASES.map((p) => {
                const active = frame?.phase === p.key;
                return (
                  <li
                    key={p.key}
                    aria-current={active ? 'step' : undefined}
                    className={cn(
                      'rounded-lg border px-2 py-1.5 text-center transition-colors duration-300',
                      active
                        ? 'border-react bg-react/15 text-react'
                        : 'border-ed-line text-ed-gutter',
                    )}
                  >
                    <span className="block text-xs font-semibold">{p.title}</span>
                    <span className="block text-[10px] leading-tight opacity-80">{p.help}</span>
                  </li>
                );
              })}
            </ol>

            <div>
              <PanelLabel>Component tree</PanelLabel>
              <ul className="space-y-1">
                {(frame?.tree ?? []).map((node) => {
                  const status = node.status ? STATUS[node.status] : undefined;
                  return (
                    <motion.li
                      key={node.name}
                      layout={!reduce}
                      style={{ marginLeft: node.depth * 18 }}
                      className={cn(
                        'flex items-center gap-2 rounded border px-2 py-1 font-mono text-xs transition-colors duration-300',
                        status?.cls ?? 'border-ed-line text-ed-text',
                      )}
                    >
                      <span className="text-syn-tag">&lt;{node.name} /&gt;</span>
                      {node.state && <span className="text-syn-num">{node.state}</span>}
                      {status && (
                        <span className="ml-auto font-sans text-[10px] opacity-90">
                          {status.label}
                        </span>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            {frame?.screen !== undefined && (
              <div>
                <PanelLabel>On screen</PanelLabel>
                <div className="rounded-lg border border-ed-line bg-white px-3 py-2 font-sans text-sm text-[#171a2b]">
                  <TextWithCode text={frame.screen} />
                </div>
              </div>
            )}
          </div>
        </div>
        <StepNote step={stepper.step} note={frame?.note} />
      </EditorFrame>
    </figure>
  );
}
