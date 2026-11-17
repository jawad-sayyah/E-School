// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import { createNodeWorker } from '../../test/nodeWorker';
import { checkExercise } from '@/runner/checkExercise';
import { runToEnd } from '@/runner/runCode';
import { parseFrontmatter } from '@/search/extract';
import { COURSES } from './courses';
import { findMissingLessons } from './lessons';
import { COMPONENT_KINDS } from '@/components/questions/kinds';
import { fillBlanks, parseBlanks } from '@/questions/blanks';

/*
 * Keeps lessons honest: every runnable example must print exactly its expected
 * output, every exercise solution must pass its tests (and the starter must not).
 */

interface Node {
  type: string;
  name?: string | null;
  lang?: string | null;
  meta?: string | null;
  value?: unknown;
  attributes?: { name?: string; value?: unknown }[];
  children?: Node[];
}

const ROOT = path.resolve(__dirname, 'courses');
const parser = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter, ['yaml']);

function evaluate(source: string): unknown {
  return new Function(`return (${source});`)();
}

function attr(node: Node, name: string): unknown {
  const found = node.attributes?.find((a) => a.name === name);
  if (!found) return undefined;
  if (found.value === null || found.value === undefined) return true; // boolean attribute
  if (typeof found.value === 'string') return found.value;
  const expr = found.value as { value: string };
  return evaluate(expr.value);
}

function findAll(node: Node, name: string, out: Node[] = []): Node[] {
  if (node.type === 'mdxJsxFlowElement' && node.name === name) out.push(node);
  node.children?.forEach((c) => findAll(c, name, out));
  return out;
}

const codeIn = (node: Node) => (node.children ?? []).filter((c) => c.type === 'code');

const lessonFiles = fs.readdirSync(ROOT).flatMap((course) =>
  fs
    .readdirSync(path.join(ROOT, course))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => ({ course, file: f, abs: path.join(ROOT, course, f) })),
);

const run = { createWorker: createNodeWorker };

test('every lesson in the manifest has a file', () => {
  expect(findMissingLessons()).toEqual([]);
});

test('every lesson file is listed in the manifest', () => {
  for (const { course, file, abs } of lessonFiles) {
    const { id } = parseFrontmatter(fs.readFileSync(abs, 'utf8'), file);
    expect(COURSES.find((c) => c.id === course)?.lessons, `${course}/${file}`).toContain(id);
  }
});

test('every course with lessons has at least one exercise (PROMPT.md §10)', () => {
  const courses = new Set(lessonFiles.map((l) => l.course));
  for (const course of courses) {
    const exercises = lessonFiles
      .filter((l) => l.course === course)
      .flatMap((l) => findAll(parser.parse(fs.readFileSync(l.abs, 'utf8')) as Node, 'Exercise'));
    expect(exercises.length, course).toBeGreaterThanOrEqual(1);
  }
});

describe.each(lessonFiles)('$course/$file', ({ abs }) => {
  const source = fs.readFileSync(abs, 'utf8');
  const tree = parser.parse(source) as Node;

  test('has one quiz with 3–5 valid questions', () => {
    const quizzes = findAll(tree, 'Quiz');
    expect(quizzes).toHaveLength(1);
    const questions = attr(quizzes[0], 'questions') as {
      options: string[];
      answer: number | number[];
    }[];
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(5);
    for (const q of questions) {
      const answers = Array.isArray(q.answer) ? (q.answer as number[]) : [q.answer];
      expect(answers.length).toBeGreaterThan(0);
      for (const a of answers) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(q.options.length);
      }
    }
  });

  const playgrounds = findAll(tree, 'Playground').filter((p) => !attr(p, 'browserOnly'));
  test.each(playgrounds.map((p, i) => ({ p, name: String(attr(p, 'file') ?? i) })))(
    'playground $name prints its expected output',
    async ({ p }) => {
      const code = String(codeIn(p)[0]?.value ?? '');
      const expected = attr(p, 'expected') as string[] | undefined;
      expect(expected, 'every playground needs expected output').toBeDefined();
      const out = await runToEnd(code, {
        ...run,
        fetchMocks: attr(p, 'fetchMocks') as never,
      });
      expect(out.status).toBe('done');
      expect(out.lines.map((l) => l.text)).toEqual(expected);
    },
  );

  const exercises = findAll(tree, 'Exercise');
  test.each(exercises.map((e) => ({ e, id: String(attr(e, 'id')) })))(
    'exercise $id: the solution passes and the starter does not',
    async ({ e }) => {
      const blocks = codeIn(e);
      const get = (word: string) =>
        String(blocks.find((b) => (b.meta ?? '').split(/\s+/).includes(word))?.value ?? '');
      const tests = get('tests');
      expect(tests).not.toBe('');
      const solution = await checkExercise(get('solution'), tests, run);
      expect(solution.problem).toBeUndefined();
      expect(solution.results.filter((r) => r.status === 'fail')).toEqual([]);
      expect(solution.passed).toBe(true);
      const starter = await checkExercise(get('starter'), tests, run);
      expect(starter.passed).toBe(false);
      const hints = attr(e, 'hints') as string[] | undefined;
      expect(hints?.length ?? 0).toBeLessThanOrEqual(3);
    },
  );
});

/* ── Questions (PROMPT.md 0.3): variety, unique ids, and answers that are really right ── */

const QUESTION_COMPONENTS = Object.keys(COMPONENT_KINDS);

function questionsIn(tree: Node): Node[] {
  return QUESTION_COMPONENTS.flatMap((name) => findAll(tree, name));
}

function kindOf(node: Node): string {
  const kind = COMPONENT_KINDS[node.name ?? ''];
  if (kind === 'quiz') return 'choice';
  if (kind === 'write-code' && attr(node, 'variant') === 'fix') return 'fix-bug';
  if (kind === 'write-code' && attr(node, 'variant') === 'build') return 'build-ui';
  return kind;
}

describe.each(lessonFiles)('$course/$file questions', ({ abs }) => {
  const tree = parser.parse(fs.readFileSync(abs, 'utf8')) as Node;
  const questions = questionsIn(tree);

  test('mixes at least 3 different question types', () => {
    const kinds = new Set(questions.map(kindOf));
    expect([...kinds].length, `kinds: ${[...kinds].join(', ')}`).toBeGreaterThanOrEqual(3);
  });

  test('question ids are unique in the lesson', () => {
    const ids = questions.filter((q) => q.name !== 'Quiz').map((q) => String(attr(q, 'id')));
    expect(ids.every((id) => id && id !== 'undefined')).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const predicts = findAll(tree, 'Predict');
  test.each(predicts.map((p) => ({ p, id: String(attr(p, 'id')) })))(
    'predict $id: the answer is what the code really prints',
    async ({ p }) => {
      const code = String(codeIn(p)[0]?.value ?? '');
      const out = await runToEnd(code, run);
      expect(out.status).toBe('done');
      expect(out.lines.map((l) => l.text)).toEqual(attr(p, 'answer'));
    },
  );

  const blanks = findAll(tree, 'FillBlanks');
  test.each(blanks.map((b) => ({ b, id: String(attr(b, 'id')) })))(
    'blanks $id: has blanks, and the filled-in code runs without errors',
    async ({ b }) => {
      const code = String(codeIn(b)[0]?.value ?? '');
      expect(parseBlanks(code).answers.length).toBeGreaterThan(0);
      if (attr(b, 'run') === 'false') return;
      const out = await runToEnd(fillBlanks(code), run);
      expect(out.status).toBe('done');
      expect(out.lines.filter((l) => l.level === 'error')).toEqual([]);
    },
  );

  const bugs = findAll(tree, 'SpotTheBug');
  test.each(bugs.map((b) => ({ b, id: String(attr(b, 'id')) })))(
    'spot-the-bug $id: the bug line exists, and the fixed code runs cleanly',
    async ({ b }) => {
      const blocks = codeIn(b);
      const buggy = String(blocks.find((c) => !(c.meta ?? '').includes('fixed'))?.value ?? '');
      const lines = buggy.split('\n').length;
      const marked = attr(b, 'bug');
      for (const line of Array.isArray(marked) ? marked : [marked]) {
        expect(line).toBeGreaterThanOrEqual(1);
        expect(line).toBeLessThanOrEqual(lines);
      }
      const fixed = blocks.find((c) => (c.meta ?? '').includes('fixed'));
      if (fixed) {
        const out = await runToEnd(String(fixed.value), run);
        expect(out.lines.filter((l) => l.level === 'error')).toEqual([]);
      }
    },
  );

  test('every other question type is well-formed', () => {
    for (const m of findAll(tree, 'MatchPairs')) {
      const pairs = attr(m, 'pairs') as [string, string][];
      expect(pairs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(pairs.map((p) => p[1])).size).toBe(pairs.length);
    }
    for (const s of findAll(tree, 'SortBuckets')) {
      const buckets = attr(s, 'buckets') as string[];
      const items = attr(s, 'items') as [string, number][];
      expect(buckets.length).toBeGreaterThanOrEqual(2);
      for (const [, b] of items) expect(b).toBeLessThan(buckets.length);
      for (let b = 0; b < buckets.length; b++) expect(items.some(([, x]) => x === b)).toBe(true);
    }
    for (const o of findAll(tree, 'OrderLines')) {
      const code = String(codeIn(o)[0]?.value ?? '');
      expect(code.split('\n').filter((l) => l.trim()).length).toBeGreaterThanOrEqual(3);
    }
    for (const t of findAll(tree, 'TrueFalse')) {
      const statements = attr(t, 'statements') as { answer: unknown; explain: string }[];
      expect(statements.length).toBeGreaterThanOrEqual(2);
      for (const s of statements) {
        expect(typeof s.answer).toBe('boolean');
        expect(s.explain.length).toBeGreaterThan(0);
      }
    }
    for (const r of findAll(tree, 'CodeReview')) {
      const options = codeIn(r);
      const answer = attr(r, 'answer') as number;
      expect(options.length).toBeGreaterThanOrEqual(2);
      expect(answer).toBeLessThan(options.length);
      expect((attr(r, 'reasons') as string[]).length).toBe(options.length);
    }
    for (const c of findAll(tree, 'Choice')) {
      const options = attr(c, 'options') as string[];
      const answer = attr(c, 'answer') as number | number[];
      for (const a of Array.isArray(answer) ? answer : [answer])
        expect(a).toBeLessThan(options.length);
    }
    for (const t of findAll(tree, 'TraceState')) {
      expect((attr(t, 'steps') as unknown[]).length).toBeGreaterThanOrEqual(2);
    }
  });
});
