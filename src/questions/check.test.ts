// @vitest-environment node
import { describe, expect, test } from 'vitest';
import {
  canonical,
  checkBlanks,
  checkBuckets,
  checkChoice,
  checkMatch,
  checkOrder,
  checkPredict,
  checkSpotBug,
  checkTrace,
} from './check';
import { shuffledIndexes } from './shuffle';
import { fillBlanks, parseBlanks } from './blanks';

describe('canonical', () => {
  test('ignores quote style and spacing around punctuation', () => {
    expect(canonical(`[ 'Coffee', "Bagel" ]`)).toBe(canonical(`['Coffee','Bagel']`));
    expect(canonical('{ qty: 2 }')).toBe(canonical('{qty:2}'));
    expect(canonical('  Coffee   2 ')).toBe('Coffee 2');
  });
});

describe('checkPredict', () => {
  const answer = ['Order placed', 'Waiting…', 'Order shipped!'];

  test('accepts the exact output, ignoring blank lines and spacing', () => {
    expect(checkPredict('Order placed\n\nWaiting…\n  Order shipped!  ', answer).correct).toBe(true);
    expect(checkPredict('[ 8, 6, 10 ]', ['[8,6,10]']).correct).toBe(true);
  });

  test('gives a hint for the wrong order', () => {
    const r = checkPredict('Order placed\nOrder shipped!\nWaiting…', answer);
    expect(r.correct).toBe(false);
    expect(r.hint).toMatch(/wrong order/);
  });

  test('gives a hint for the wrong number of lines', () => {
    expect(checkPredict('Order placed', answer).hint).toMatch(/3 lines/);
  });

  test('gives a hint for case mistakes', () => {
    expect(checkPredict('order placed\nwaiting…\norder shipped!', answer).hint).toMatch(/case/);
  });

  test('counts the right lines', () => {
    const r = checkPredict('Order placed\nWaiting…\nShipped', answer);
    expect(r.score).toEqual({ right: 2, total: 3 });
    expect(r.parts).toEqual([true, true, false]);
    expect(r.hint).toMatch(/line 3/);
  });

  test('asks for input when empty', () => {
    expect(checkPredict('   ', answer).hint).toMatch(/Type what the console prints/);
  });
});

describe('checkBlanks', () => {
  test('accepts alternatives and ignores spaces', () => {
    const r = checkBlanks(['reduce', 'p=>p*2'], [['reduce'], ['p => p * 2', 'x => x * 2']]);
    expect(r.correct).toBe(true);
  });

  test('marks the wrong blanks', () => {
    const r = checkBlanks(['map', '0'], [['reduce'], ['0']]);
    expect(r.parts).toEqual([false, true]);
    expect(r.hint).toMatch(/1 of 2/);
  });

  test('reminds about empty blanks', () => {
    expect(checkBlanks(['', '0'], [['reduce'], ['0']]).hint).toMatch(/1 still empty/);
  });

  test('can ignore case', () => {
    expect(checkBlanks(['TRUE'], [['true']], false).correct).toBe(true);
    expect(checkBlanks(['TRUE'], [['true']]).correct).toBe(false);
  });
});

describe('checkOrder', () => {
  const want = ['let total = 0;', 'for (const p of prices) {', '  total += p;', '}'];

  test('the right order is correct', () => {
    expect(checkOrder([...want], want).correct).toBe(true);
  });

  test('identical lines can swap places', () => {
    const code = ['if (a) {', '}', 'if (b) {', '}'];
    expect(checkOrder(['if (a) {', '}', 'if (b) {', '}'], code).correct).toBe(true);
  });

  test('other valid orders can be accepted', () => {
    const swapped = ['const a = 1;', 'const b = 2;'];
    expect(checkOrder(swapped, ['const b = 2;', 'const a = 1;'], [swapped]).correct).toBe(true);
  });

  test('counts lines in place and hints about the first line', () => {
    const r = checkOrder([want[1], want[0], want[2], want[3]], want);
    expect(r.score).toEqual({ right: 2, total: 4 });
    expect(r.hint).toMatch(/first/);
    expect(checkOrder([want[0], want[2], want[1], want[3]], want).hint).toMatch(/2 of 4/);
  });
});

describe('checkMatch / checkBuckets', () => {
  test('match pairs', () => {
    expect(checkMatch([0, 1, 2]).correct).toBe(true);
    expect(checkMatch([1, 0, 2]).score).toEqual({ right: 1, total: 3 });
    expect(checkMatch([0, null, null]).hint).toMatch(/2 left/);
  });

  test('buckets', () => {
    expect(checkBuckets([0, 1, 1], [0, 1, 1]).correct).toBe(true);
    expect(checkBuckets([0, 0, 1], [0, 1, 1]).parts).toEqual([true, false, true]);
    expect(checkBuckets([0, null, 1], [0, 1, 1]).hint).toMatch(/1 left/);
  });
});

describe('checkChoice', () => {
  test('single answer', () => {
    expect(checkChoice([2], 2).correct).toBe(true);
    expect(checkChoice([1], 2).correct).toBe(false);
  });

  test('multi-select needs exactly the right set', () => {
    expect(checkChoice([0, 2], [2, 0]).correct).toBe(true);
    expect(checkChoice([0], [0, 2]).hint).toMatch(/1 of 2/);
    expect(checkChoice([0, 1], [0, 2]).hint).toMatch(/1 of your choices is wrong/);
  });
});

describe('checkSpotBug / checkTrace', () => {
  test('spot the bug', () => {
    expect(checkSpotBug(3, [3]).correct).toBe(true);
    expect(checkSpotBug(2, [3]).correct).toBe(false);
  });

  test('trace the state step by step', () => {
    const r = checkTrace(['1', '[ 1, 2 ]', '0'], [['1'], ['[1,2]'], ['3']]);
    expect(r.parts).toEqual([true, true, false]);
    expect(r.hint).toMatch(/step 3/);
  });
});

describe('shuffledIndexes', () => {
  test('is stable for a seed and never starts solved', () => {
    expect(shuffledIndexes(5, 'q1')).toEqual(shuffledIndexes(5, 'q1'));
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const order = shuffledIndexes(4, seed);
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
      expect(order).not.toEqual([0, 1, 2, 3]);
    }
    expect(shuffledIndexes(2, 'x')).toEqual([1, 0]);
    expect(shuffledIndexes(1, 'x')).toEqual([0]);
  });
});

describe('parseBlanks', () => {
  test('splits code into text and blanks with alternatives', () => {
    const { segments, answers } = parseBlanks(
      'const t = a.__[reduce]__((s, p) => s + p, __[0|0.0]__);',
    );
    expect(answers).toEqual([['reduce'], ['0', '0.0']]);
    expect(segments).toEqual([
      'const t = a.',
      { blank: 0, answers: ['reduce'] },
      '((s, p) => s + p, ',
      { blank: 1, answers: ['0', '0.0'] },
      ');',
    ]);
  });

  test('leaves real code with [[ ]] and {{ }} alone', () => {
    expect(parseBlanks('const m = [[1, 2]]; f({{}})').answers).toEqual([]);
  });

  test('fills blanks with the first answer or given values', () => {
    expect(fillBlanks('x.__[map|forEach]__(f)')).toBe('x.map(f)');
    expect(fillBlanks('__[a]__ + __[b]__', ['1', '2'])).toBe('1 + 2');
  });
});
