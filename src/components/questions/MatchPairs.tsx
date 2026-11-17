import { useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { TextWithCode } from '@/components/InlineCode';
import { checkMatch } from '@/questions/check';
import { shuffledIndexes } from '@/questions/shuffle';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

/** Text for screen readers: drop the `backticks` that mark inline code. */
const plain = (text: string) => text.replace(/`/g, '');

interface MatchPairsProps {
  id: string;
  /** [left, right] pairs in the correct matching. The right side is shuffled. */
  pairs: [string, string][];
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  /** Column titles, e.g. ["Hook", "Use it to…"]. */
  columns?: [string, string];
}

/** Pair colors: each match gets its own tint, so connected items are easy to see. */
const PAIR_STYLES = [
  'border-syn-fn bg-syn-fn/10',
  'border-syn-kw bg-syn-kw/10',
  'border-syn-str bg-syn-str/10',
  'border-syn-num bg-syn-num/10',
  'border-react bg-react/10',
  'border-js bg-js/10',
  'border-syn-tag bg-syn-tag/10',
  'border-syn-type bg-syn-type/10',
];
const PAIR_DOT = [
  'bg-syn-fn',
  'bg-syn-kw',
  'bg-syn-str',
  'bg-syn-num',
  'bg-react',
  'bg-js',
  'bg-syn-tag',
  'bg-syn-type',
];

/** Match pairs: pick an item on the left, then its partner on the right. */
export function MatchPairs({
  id,
  pairs,
  prompt = 'Match each item on the left with its partner on the right.',
  explain,
  hint,
  columns,
}: MatchPairsProps) {
  const reduce = useReducedMotion();
  const q = useQuestion(id, 'match');
  const rightOrder = useMemo(() => shuffledIndexes(pairs.length, id), [pairs.length, id]);
  const [matches, setMatches] = useState<(number | null)[]>(() => pairs.map(() => null));
  const [selected, setSelected] = useState<number | null>(null);
  const shown = q.status === 'revealed' ? pairs.map((_, i) => i) : matches;
  const marks = q.status === 'wrong' || q.status === 'correct' ? q.result?.parts : undefined;

  const pairOfRight = (right: number) => shown.indexOf(right);

  const pickLeft = (left: number) => {
    if (q.locked) return;
    if (q.status === 'wrong') q.retry();
    if (matches[left] !== null) {
      setMatches((m) => m.map((v, i) => (i === left ? null : v)));
    }
    // Always select (never toggle off): after a match the next item is pre-selected,
    // and clicking it again must keep it selected.
    setSelected(left);
  };

  const pickRight = (right: number) => {
    if (q.locked) return;
    if (q.status === 'wrong') q.retry();
    const owner = matches.indexOf(right);
    if (selected === null) {
      // Clicking a matched right item un-matches it.
      if (owner >= 0) setMatches((m) => m.map((v, i) => (i === owner ? null : v)));
      return;
    }
    setMatches((m) => m.map((v, i) => (i === selected ? right : v === right ? null : v)));
    const next = matches.findIndex((v, i) => v === null && i !== selected);
    setSelected(next >= 0 ? next : null);
  };

  const itemClass = (pair: number, active: boolean) =>
    cn(
      'flex w-full items-center gap-2.5 rounded-lg border-2 border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-faint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      pair >= 0 && PAIR_STYLES[pair % PAIR_STYLES.length],
      active && 'border-primary ring-2 ring-primary/30',
      q.locked && 'cursor-default hover:border-inherit',
    );

  return (
    <QuestionCard
      kind="match"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint ?? 'Tap a matched item to undo it.'}
      canCheck={matches.some((m) => m !== null)}
      onCheck={() => q.submit(checkMatch(matches))}
      onRetry={() => setSelected(null)}
    >
      <div className="my-3 grid gap-3 sm:grid-cols-2">
        <div>
          {columns && (
            <p className="mb-1.5 text-xs font-semibold text-faint uppercase">{columns[0]}</p>
          )}
          <ul className="space-y-2">
            {pairs.map(([left], i) => (
              <li key={i}>
                <motion.button
                  type="button"
                  layout={!reduce}
                  onClick={() => pickLeft(i)}
                  aria-pressed={selected === i}
                  aria-label={plain(
                    `${left}${shown[i] !== null ? `, matched with ${pairs[shown[i]!][1]}` : ''}`,
                  )}
                  className={itemClass(shown[i] !== null ? i : -1, selected === i)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2.5 shrink-0 rounded-full bg-border',
                      shown[i] !== null && PAIR_DOT[i % PAIR_DOT.length],
                    )}
                  />
                  <span className="flex-1">
                    <TextWithCode text={left} />
                  </span>
                  {marks && (
                    <span
                      className={marks[i] ? 'text-success' : 'text-danger'}
                      aria-label={marks[i] ? 'right' : 'wrong'}
                    >
                      {marks[i] ? '✓' : '✗'}
                    </span>
                  )}
                </motion.button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          {columns && (
            <p className="mb-1.5 text-xs font-semibold text-faint uppercase">{columns[1]}</p>
          )}
          <ul className="space-y-2">
            {rightOrder.map((r) => {
              const owner = pairOfRight(r);
              return (
                <li key={r}>
                  <motion.button
                    type="button"
                    layout={!reduce}
                    onClick={() => pickRight(r)}
                    aria-label={plain(
                      `${pairs[r][1]}${owner >= 0 ? `, matched with ${pairs[owner][0]}` : ''}`,
                    )}
                    className={itemClass(owner, false)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2.5 shrink-0 rounded-full bg-border',
                        owner >= 0 && PAIR_DOT[owner % PAIR_DOT.length],
                      )}
                    />
                    <span className="flex-1">
                      <TextWithCode text={pairs[r][1]} />
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </QuestionCard>
  );
}
