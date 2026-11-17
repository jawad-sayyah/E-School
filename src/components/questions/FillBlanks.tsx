import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { EditorFrame } from '@/editor/EditorFrame';
import { TOKEN_CLASS, tokenize } from '@/editor/highlight';
import { checkBlanks } from '@/questions/check';
import { parseBlanks } from '@/questions/blanks';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface FillBlanksProps {
  id: string;
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  file?: string;
  caseSensitive?: boolean;
  /** One fenced block; blanks are written as __[answer]__ or __[answer|alternative]__. */
  children?: ReactNode;
}

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((t, i) =>
        t.kind === 'plain' ? (
          <Fragment key={i}>{t.text}</Fragment>
        ) : (
          <span key={i} className={TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ),
      )}
    </>
  );
}

/** Fill in the blanks: inputs placed right inside the code. */
export function FillBlanks({
  id,
  prompt = 'Fill in the blanks so the code works.',
  explain,
  hint,
  file = 'blanks.js',
  caseSensitive = true,
  children,
}: FillBlanksProps) {
  const raw = getCodeBlocks(children)[0]?.code ?? '';
  const { segments, answers } = useMemo(() => parseBlanks(raw), [raw]);
  const q = useQuestion(id, 'blanks');
  const [values, setValues] = useState<string[]>(() => answers.map(() => ''));
  const shown = q.status === 'revealed' ? answers.map((a) => a[0]) : values;
  const marks = q.status === 'wrong' || q.status === 'correct' ? q.result?.parts : undefined;

  return (
    <QuestionCard
      kind="blanks"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint}
      canCheck={values.some((v) => v.trim() !== '')}
      onCheck={() => q.submit(checkBlanks(values, answers, caseSensitive))}
    >
      <EditorFrame file={file} lang="js" className="my-3">
        <pre className="overflow-x-auto bg-ed-bg px-4 py-3.5 font-mono text-[14px] leading-[30px] text-ed-text">
          <code>
            {segments.map((seg, i) =>
              typeof seg === 'string' ? (
                <Highlighted key={i} text={seg} />
              ) : (
                <input
                  key={i}
                  value={shown[seg.blank]}
                  onChange={(e) =>
                    setValues((prev) => prev.map((v, j) => (j === seg.blank ? e.target.value : v)))
                  }
                  readOnly={q.locked}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  aria-label={`Blank ${seg.blank + 1} of ${answers.length}`}
                  style={{
                    width: `${Math.max(4, shown[seg.blank].length, ...seg.answers.map((a) => a.length)) + 2}ch`,
                  }}
                  className={cn(
                    'mx-0.5 inline-block h-7 rounded-md border border-ed-line bg-con-bg px-1.5 text-center align-middle font-mono text-[14px] text-syn-type outline-none focus:border-syn-fn focus:ring-2 focus:ring-syn-fn/30',
                    marks?.[seg.blank] === true && 'border-syn-str text-syn-str',
                    marks?.[seg.blank] === false && 'border-[#FF8A80] text-[#FF8A80]',
                    q.status === 'revealed' && 'border-ed-gutter text-syn-str',
                  )}
                />
              ),
            )}
          </code>
        </pre>
      </EditorFrame>
    </QuestionCard>
  );
}
