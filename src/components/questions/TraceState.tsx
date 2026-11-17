import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { TextWithCode } from '@/components/InlineCode';
import { checkTrace } from '@/questions/check';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { CodeView } from './CodeView';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

export interface TraceStep {
  /** What happens, e.g. "Click “Add Coffee”" or "Line 3 runs". */
  action: string;
  /** The state after this step; alternatives allowed. */
  answer: string | string[];
}

interface TraceStateProps {
  id: string;
  steps: TraceStep[];
  /** What to type after each step, e.g. "the value of `cart.length`". */
  track: string;
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  file?: string;
  children?: ReactNode;
}

/** Trace the state: step through actions and type the state after each one. */
export function TraceState({
  id,
  steps,
  track,
  prompt,
  explain,
  hint,
  file = 'trace.js',
  children,
}: TraceStateProps) {
  const code = getCodeBlocks(children)[0]?.code;
  const answers = steps.map((s) => (Array.isArray(s.answer) ? s.answer : [s.answer]));
  const q = useQuestion(id, 'trace');
  const [values, setValues] = useState<string[]>(() => steps.map(() => ''));
  const shown = q.status === 'revealed' ? answers.map((a) => a[0]) : values;
  const marks = q.status === 'wrong' || q.status === 'correct' ? q.result?.parts : undefined;

  return (
    <QuestionCard
      kind="trace"
      q={q}
      prompt={prompt ?? `Step through the code. After each step, type ${track}.`}
      explain={explain}
      hint={hint}
      canCheck={values.every((v) => v.trim() !== '')}
      onCheck={() => q.submit(checkTrace(values, answers))}
    >
      {code && <CodeView code={code} file={file} />}
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className={cn(
              'grid items-center gap-2 rounded-lg border border-border p-2.5 sm:grid-cols-[2rem_1fr_minmax(8rem,14rem)]',
              marks?.[i] === true && 'border-success/50',
              marks?.[i] === false && 'border-danger/50',
            )}
          >
            <span className="grid size-7 place-items-center rounded-full bg-muted font-mono text-xs text-faint">
              {i + 1}
            </span>
            <span className="text-sm">
              <TextWithCode text={step.action} />
            </span>
            <Input
              value={shown[i]}
              onChange={(e) => {
                if (q.status === 'wrong') q.retry();
                setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)));
              }}
              readOnly={q.locked}
              spellCheck={false}
              aria-label={`Step ${i + 1}: ${track}`}
              placeholder="State after this step"
              className="font-mono"
            />
          </li>
        ))}
      </ol>
    </QuestionCard>
  );
}
