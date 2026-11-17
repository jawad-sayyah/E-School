import { useState, type ReactNode } from 'react';
import { TextWithCode } from '@/components/InlineCode';
import { checkChoice } from '@/questions/check';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { CodeView } from './CodeView';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface CodeReviewProps {
  id: string;
  /** Index of the best implementation. */
  answer: number;
  /** Why each option is good or bad, shown after answering (same order as the code blocks). */
  reasons: string[];
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  /** Two or more fenced blocks: the implementations to compare. */
  children?: ReactNode;
}

const LETTERS = 'ABCDEF';

/** Code review: pick the best of several implementations, then see why. */
export function CodeReview({
  id,
  answer,
  reasons,
  prompt = 'Which implementation would you approve in a code review?',
  explain,
  hint,
  children,
}: CodeReviewProps) {
  const options = getCodeBlocks(children);
  const q = useQuestion(id, 'code-review');
  const [picked, setPicked] = useState<number | null>(null);
  const answered = q.status === 'correct' || q.status === 'revealed';

  return (
    <QuestionCard
      kind="code-review"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint}
      canCheck={picked !== null}
      onCheck={() => q.submit(checkChoice(picked === null ? [] : [picked], answer))}
      onRetry={() => setPicked(null)}
    >
      <div role="radiogroup" aria-label="Implementations" className="my-3 grid gap-3">
        {options.map((opt, i) => {
          const best = i === answer;
          return (
            <div
              key={i}
              className={cn(
                'rounded-xl border-2 border-transparent p-1 transition-colors',
                picked === i && q.status === 'idle' && 'border-primary',
                picked === i && q.status === 'wrong' && 'border-danger/70',
                answered && best && 'border-success/70',
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={picked === i}
                disabled={q.locked}
                onClick={() => {
                  if (q.status === 'wrong') q.retry();
                  setPicked(i);
                }}
                className="mb-1 flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:hover:bg-transparent"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 place-items-center rounded-full border border-border text-[11px]',
                    picked === i && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {LETTERS[i]}
                </span>
                Option {LETTERS[i]}
                {answered && best && <span className="text-success">· the one to approve</span>}
              </button>
              <CodeView
                code={opt.code}
                file={`option-${LETTERS[i].toLowerCase()}.${opt.lang || 'js'}`}
                lang={opt.lang || 'js'}
              />
              {answered && reasons[i] && (
                <p
                  className={cn(
                    'px-2 pb-1 text-sm',
                    best ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  <TextWithCode text={reasons[i]} />
                </p>
              )}
            </div>
          );
        })}
      </div>
    </QuestionCard>
  );
}
