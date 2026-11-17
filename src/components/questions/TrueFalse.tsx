import { useState, type ReactNode } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { TextWithCode } from '@/components/InlineCode';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

export interface Statement {
  text: string;
  answer: boolean;
  /** Why it's true or false (shown after answering). */
  explain: string;
}

interface TrueFalseProps {
  id: string;
  statements: Statement[];
  prompt?: ReactNode;
  hint?: string;
}

/** True or false: decide for each statement, then see the explanation for each one. */
export function TrueFalse({ id, statements, prompt = 'True or false?', hint }: TrueFalseProps) {
  const q = useQuestion(id, 'true-false');
  const [values, setValues] = useState<(boolean | null)[]>(() => statements.map(() => null));
  const shown = q.status === 'revealed' ? statements.map((s) => s.answer) : values;
  const answered = q.status === 'correct' || q.status === 'revealed';

  const check = () => {
    const parts = statements.map((s, i) => values[i] === s.answer);
    const right = parts.filter(Boolean).length;
    q.submit({
      correct: right === statements.length,
      score: { right, total: statements.length },
      parts,
      hint: `${right} of ${statements.length} answers are right. The wrong ones are marked.`,
    });
  };

  return (
    <QuestionCard
      kind="true-false"
      q={q}
      prompt={prompt}
      hint={hint}
      canCheck={values.every((v) => v !== null)}
      onCheck={check}
    >
      <ul className="my-3 space-y-2">
        {statements.map((s, i) => {
          const mark =
            q.status === 'wrong' || q.status === 'correct' ? q.result?.parts?.[i] : undefined;
          return (
            <li
              key={i}
              className={cn(
                'rounded-lg border border-border p-3',
                mark === true && 'border-success/50',
                mark === false && 'border-danger/50',
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm">
                  <TextWithCode text={s.text} />
                </p>
                <div role="radiogroup" aria-label={`Statement ${i + 1}`} className="flex gap-1.5">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      role="radio"
                      aria-checked={shown[i] === value}
                      disabled={q.locked}
                      onClick={() => {
                        if (q.status === 'wrong') q.retry();
                        setValues((v) => v.map((x, j) => (j === i ? value : x)));
                      }}
                      className={cn(
                        'inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:hover:bg-transparent',
                        shown[i] === value && value && 'border-success bg-success/15 text-success',
                        shown[i] === value && !value && 'border-danger bg-danger/15 text-danger',
                      )}
                    >
                      {value ? (
                        <CheckIcon aria-hidden className="size-3.5" />
                      ) : (
                        <XIcon aria-hidden className="size-3.5" />
                      )}
                      {value ? 'True' : 'False'}
                    </button>
                  ))}
                </div>
              </div>
              {answered && (
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong className="text-foreground">{s.answer ? 'True.' : 'False.'}</strong>{' '}
                  <TextWithCode text={s.explain} />
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </QuestionCard>
  );
}
