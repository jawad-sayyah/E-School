import { useState, type ReactNode } from 'react';
import { CheckIcon } from 'lucide-react';
import { TextWithCode } from '@/components/InlineCode';
import { checkChoice } from '@/questions/check';
import { getCodeBlocks, langOf } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { CodeView } from './CodeView';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface ChoiceProps {
  id: string;
  q: string;
  options: string[];
  /** One index, or several for a multi-select question. */
  answer: number | number[];
  explain?: ReactNode;
  hint?: string;
  /** Optional code shown under the question (a fenced block inside). */
  children?: ReactNode;
}

const LETTERS = 'ABCDEFGH';

/** One multiple-choice question; an array `answer` makes it multi-select. */
export function Choice({ id, q: question, options, answer, explain, hint, children }: ChoiceProps) {
  const block = getCodeBlocks(children)[0];
  const lang = langOf(block);
  const multi = Array.isArray(answer);
  const correctSet = new Set(Array.isArray(answer) ? answer : [answer]);
  const q = useQuestion(id, 'choice');
  const [picked, setPicked] = useState<number[]>([]);
  const shown = q.status === 'revealed' ? [...correctSet] : picked;
  const answered = q.status === 'correct' || q.status === 'revealed';

  const toggle = (i: number) => {
    if (q.locked) return;
    if (q.status === 'wrong') q.retry();
    setPicked((p) => (multi ? (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]) : [i]));
  };

  return (
    <QuestionCard
      kind="choice"
      q={q}
      prompt={
        <>
          <TextWithCode text={question} />
          {multi && (
            <span className="ml-1 text-sm font-normal text-faint">(pick all that apply)</span>
          )}
        </>
      }
      explain={explain}
      hint={hint}
      canCheck={picked.length > 0}
      onCheck={() => q.submit(checkChoice(picked, answer))}
    >
      {block && <CodeView code={block.code} lang={lang} file={`question.${lang}`} />}
      <div role={multi ? 'group' : 'radiogroup'} aria-label="Answers" className="mt-3 grid gap-2">
        {options.map((option, i) => {
          const on = shown.includes(i);
          return (
            <button
              key={i}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              disabled={q.locked}
              onClick={() => toggle(i)}
              className={cn(
                'flex min-h-10 items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:hover:bg-transparent',
                on && !answered && 'border-primary bg-primary/10',
                on && q.status === 'wrong' && !correctSet.has(i) && 'border-danger bg-danger/10',
                answered && correctSet.has(i) && 'border-success bg-success/10',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-6 shrink-0 place-items-center border border-border font-mono text-xs',
                  multi ? 'rounded-md' : 'rounded-full',
                  on && 'border-primary bg-primary text-primary-foreground',
                )}
              >
                {on && multi ? <CheckIcon className="size-3.5" /> : LETTERS[i]}
              </span>
              <span>
                <TextWithCode text={option} />
              </span>
            </button>
          );
        })}
      </div>
    </QuestionCard>
  );
}
