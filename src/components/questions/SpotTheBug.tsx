import { useState, type ReactNode } from 'react';
import { TOKEN_CLASS, tokenize } from '@/editor/highlight';
import { EditorFrame } from '@/editor/EditorFrame';
import { checkSpotBug } from '@/questions/check';
import { findBlock, getCodeBlocks, langOf } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { CodeView } from './CodeView';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface SpotTheBugProps {
  id: string;
  /** The buggy line number(s), 1-based. */
  bug: number | number[];
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  file?: string;
  /** A fenced block with the buggy code, and optionally one marked `fixed`. */
  children?: ReactNode;
}

/** Spot the bug: click the line that's wrong. */
export function SpotTheBug({
  id,
  bug,
  prompt = 'One line has a bug. Click it, then press Check.',
  explain,
  hint,
  file,
  children,
}: SpotTheBugProps) {
  const blocks = getCodeBlocks(children);
  const buggy = blocks.find((b) => !b.meta.includes('fixed'));
  const lang = langOf(buggy);
  const code = buggy?.code ?? '';
  const name = file ?? `buggy.${lang}`;
  const fixed = findBlock(blocks, 'fixed')?.code;
  const bugs = Array.isArray(bug) ? bug : [bug];
  const lines = code.split('\n');
  const q = useQuestion(id, 'spot-bug');
  const [picked, setPicked] = useState<number | null>(null);
  const answered = q.status === 'correct' || q.status === 'revealed';

  return (
    <QuestionCard
      kind="spot-bug"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint}
      canCheck={picked !== null}
      onCheck={() => q.submit(checkSpotBug(picked, bugs))}
      onRetry={() => setPicked(null)}
    >
      <EditorFrame file={name} lang={lang} className="my-3">
        <ol
          aria-label="Lines of code: pick the one with the bug"
          className="bg-ed-bg py-2 font-mono text-[14px] leading-[24px]"
        >
          {lines.map((line, i) => {
            const n = i + 1;
            const isBug = bugs.includes(n);
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={q.locked}
                  onClick={() => {
                    if (q.status === 'wrong') q.retry();
                    setPicked(n);
                  }}
                  aria-pressed={picked === n}
                  aria-label={`Line ${n}: ${line.trim() || 'empty'}`}
                  className={cn(
                    'flex w-full items-stretch text-left text-ed-text transition-colors hover:bg-ed-hover focus-visible:bg-ed-hover focus-visible:outline-none disabled:hover:bg-transparent',
                    picked === n && q.status === 'idle' && 'bg-syn-fn/15',
                    picked === n && q.status === 'wrong' && 'bg-danger/15',
                    answered && isBug && 'bg-success/15',
                  )}
                >
                  <span className="w-11 shrink-0 border-r border-ed-line pr-3 text-right text-ed-gutter select-none">
                    {n}
                  </span>
                  <code className="flex-1 overflow-x-auto px-4 whitespace-pre">
                    {tokenize(line).map((t, j) => (
                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                        {t.text}
                      </span>
                    ))}
                    {line === '' && ' '}
                  </code>
                </button>
              </li>
            );
          })}
        </ol>
      </EditorFrame>
      {answered && fixed && (
        <div>
          <p className="mt-2 text-sm font-semibold">Fixed</p>
          <CodeView code={fixed} lang={lang} file={name.replace('buggy', 'fixed')} />
        </div>
      )}
    </QuestionCard>
  );
}
