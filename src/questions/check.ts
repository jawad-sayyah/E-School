/*
 * Answer checking for every question type. Pure functions: no React, no DOM.
 * Each returns whether the answer is right, a score, and a hint that helps
 * (never just "wrong").
 */

export interface CheckResult {
  correct: boolean;
  /** How much was right, for partial credit and feedback ("3 of 5 lines"). */
  score: { right: number; total: number };
  /** Shown on a wrong answer. */
  hint?: string;
  /** Per-part correctness (blanks, lines, pairs, items…), in input order. */
  parts?: boolean[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Normalizes one line of console output or code so formatting differences don't
 * count: quotes, spacing around brackets and punctuation, and repeated spaces.
 */
export function canonical(text: string): string {
  return text
    .trim()
    .replace(/[“”"]/g, "'")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*([[\]{}(),:;=+\-*/<>!&|?])\s*/g, '$1');
}

const lines = (text: string) =>
  text
    .split('\n')
    .map(canonical)
    .filter((l) => l !== '');

/** Predict the output: the student types what the console prints. */
export function checkPredict(input: string, answer: string[]): CheckResult {
  const got = lines(input);
  const want = answer.map(canonical).filter((l) => l !== '');
  const total = want.length;
  const parts = want.map((line, i) => got[i] === line);
  const right = parts.filter(Boolean).length;
  const result = (correct: boolean, hint?: string): CheckResult => ({
    correct,
    score: { right: correct ? total : right, total },
    hint,
    parts,
  });

  if (got.length === 0)
    return result(false, 'Type what the console prints, one line per console.log.');
  if (got.length === want.length && right === total) return result(true);
  if (got.join('\n').toLowerCase() === want.join('\n').toLowerCase()) {
    return result(false, 'Almost: check upper- and lower-case letters.');
  }
  if (got.length !== want.length) {
    return result(
      false,
      `The console prints ${plural(total, 'line')}: each console.log() call makes one line.`,
    );
  }
  if ([...got].sort().join('\n') === [...want].sort().join('\n')) {
    return result(false, 'Right lines, wrong order. Which line runs first?');
  }
  const firstWrong = parts.indexOf(false) + 1;
  return result(
    false,
    right > 0
      ? `${right} of ${total} lines are right. Look again at line ${firstWrong}.`
      : `Not quite. Run through the code line by line, starting at line 1.`,
  );
}

/** Compares code-ish answers: spaces and quote styles don't matter. */
const sameCode = (a: string, b: string, caseSensitive: boolean) => {
  const norm = (s: string) => {
    const c = canonical(s).replace(/\s+/g, '');
    return caseSensitive ? c : c.toLowerCase();
  };
  return norm(a) === norm(b);
};

/** Fill in the blanks: each blank accepts any of its alternatives. */
export function checkBlanks(
  values: string[],
  answers: string[][],
  caseSensitive = true,
): CheckResult {
  const parts = answers.map((alts, i) =>
    alts.some((alt) => sameCode(values[i] ?? '', alt, caseSensitive)),
  );
  const right = parts.filter(Boolean).length;
  const total = answers.length;
  const empty = values.filter((v) => !v?.trim()).length;
  return {
    correct: right === total,
    score: { right, total },
    parts,
    hint:
      right === total
        ? undefined
        : empty > 0
          ? `Fill in all ${plural(total, 'blank')} (${empty} still empty).`
          : `${right} of ${total} blanks are right. The wrong ones are marked.`,
  };
}

/**
 * Order the lines (Parsons). Lines are compared by text, so identical lines (two closing
 * braces, say) can swap places. Other valid orders can be listed in `accept`.
 */
export function checkOrder(got: string[], want: string[], accept: string[][] = []): CheckResult {
  const norm = (l: string) => canonical(l);
  const valid = [want, ...accept];
  const best = valid
    .map((v) => v.map((line, i) => norm(got[i] ?? '') === norm(line)))
    .sort((a, b) => b.filter(Boolean).length - a.filter(Boolean).length)[0];
  const right = best.filter(Boolean).length;
  const total = want.length;
  const correct = right === total;
  return {
    correct,
    score: { right, total },
    parts: best,
    hint: correct
      ? undefined
      : !best[0]
        ? 'Start with the line that has to run first: what does everything else depend on?'
        : `${right} of ${total} lines are in the right place.`,
  };
}

/** Match pairs: `matches[left] = right`; pair i is correct when right === i. */
export function checkMatch(matches: (number | null)[]): CheckResult {
  const parts = matches.map((right, left) => right === left);
  const right = parts.filter(Boolean).length;
  const total = matches.length;
  const unmatched = matches.filter((m) => m === null).length;
  return {
    correct: right === total,
    score: { right, total },
    parts,
    hint:
      right === total
        ? undefined
        : unmatched
          ? `Match all ${plural(total, 'item')} first (${unmatched} left).`
          : `${right} of ${total} pairs are right. Tap a wrong pair to undo it.`,
  };
}

/** Sort into buckets: `placed[item]` is the chosen bucket, `correct[item]` the right one. */
export function checkBuckets(placed: (number | null)[], correct: number[]): CheckResult {
  const parts = correct.map((bucket, i) => placed[i] === bucket);
  const right = parts.filter(Boolean).length;
  const total = correct.length;
  const unsorted = placed.filter((p) => p === null).length;
  return {
    correct: right === total,
    score: { right, total },
    parts,
    hint:
      right === total
        ? undefined
        : unsorted
          ? `Sort every item first (${unsorted} left).`
          : `${right} of ${total} items are in the right bucket.`,
  };
}

/** Single or multi-select choice. */
export function checkChoice(selected: number[], answer: number | number[]): CheckResult {
  const want = new Set(Array.isArray(answer) ? answer : [answer]);
  const got = new Set(selected);
  const hits = [...got].filter((i) => want.has(i)).length;
  const wrong = got.size - hits;
  const correct = wrong === 0 && hits === want.size;
  const multi = want.size > 1;
  return {
    correct,
    score: { right: correct ? 1 : 0, total: 1 },
    hint: correct
      ? undefined
      : got.size === 0
        ? 'Pick an answer first.'
        : multi && wrong === 0
          ? `Good so far: you found ${hits} of ${want.size} right answers.`
          : multi && hits > 0
            ? `${wrong} of your choices ${wrong === 1 ? 'is' : 'are'} wrong.`
            : undefined,
  };
}

/** Spot the bug: the student clicks a line (1-based). */
export function checkSpotBug(line: number | null, bugLines: number[]): CheckResult {
  const correct = line !== null && bugLines.includes(line);
  return {
    correct,
    score: { right: correct ? 1 : 0, total: 1 },
    hint: correct ? undefined : line === null ? 'Click the line you think is wrong.' : undefined,
  };
}

/** Trace the state: one typed value per step, compared like console output. */
export function checkTrace(values: string[], answers: string[][]): CheckResult {
  const parts = answers.map((alts, i) =>
    alts.some((alt) => canonical(values[i] ?? '') === canonical(alt)),
  );
  const right = parts.filter(Boolean).length;
  const total = answers.length;
  const firstWrong = parts.indexOf(false) + 1;
  return {
    correct: right === total,
    score: { right, total },
    parts,
    hint:
      right === total
        ? undefined
        : `${right} of ${total} steps are right. Re-check step ${firstWrong}: what was the state just before it?`,
  };
}
