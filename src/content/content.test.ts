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
import { transpile, typeCheck } from '../../test/tsChecker';

const isTs = (lang?: string | null) => lang === 'ts' || lang === 'tsx';
/** Code that runs in the worker: TypeScript is compiled first. */
const runnable = (block?: Node) =>
  isTs(block?.lang)
    ? transpile(String(block?.value ?? ''), block?.lang === 'tsx')
    : String(block?.value ?? '');

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
      .flatMap((l) => {
        const tree = parser.parse(fs.readFileSync(l.abs, 'utf8')) as Node;
        return ['Exercise', 'ReactExercise', 'BuildUI', 'TSExercise'].flatMap((n) =>
          findAll(tree, n),
        );
      });
    expect(exercises.length, course).toBeGreaterThanOrEqual(1);
  }
});

describe.each(lessonFiles)('$course/$file', ({ abs }) => {
  const source = fs.readFileSync(abs, 'utf8');
  const tree = parser.parse(source) as Node;

  test('no string attribute contains an escaped quote (MDX would mis-parse it)', () => {
    // Write explain={"say \"hi\""} instead of explain="say \"hi\"".
    const bad = source.split('\n').filter((line) => /^\s*\w+="[^"\n]*\\"/.test(line));
    expect(bad).toEqual([]);
  });

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
      const block = codeIn(p)[0];
      if (isTs(block?.lang)) expect(typeCheck(String(block?.value)).diagnostics).toEqual([]);
      const out = await runToEnd(runnable(block), run);
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
      const lang = codeIn(b)[0]?.lang;
      if (isTs(lang)) {
        expect(typeCheck(fillBlanks(code), '', lang === 'tsx').diagnostics).toEqual([]);
        return;
      }
      if (attr(b, 'run') === 'false' || lang === 'jsx') return; // JSX can't run in the worker
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
      const buggyBlock = blocks.find((c) => !(c.meta ?? '').includes('fixed'));
      if (isTs(buggyBlock?.lang) && attr(b, 'runtime') !== true) {
        const errorLines = typeCheck(buggy, '', buggyBlock?.lang === 'tsx').diagnostics.map(
          (d) => d.line,
        );
        const want = (Array.isArray(marked) ? marked : [marked]) as number[];
        expect([...new Set(errorLines)].sort((x, y) => x - y)).toEqual(
          [...want].sort((x, y) => x - y),
        );
      }
      const fixed = blocks.find((c) => (c.meta ?? '').includes('fixed'));
      if (fixed && isTs(fixed.lang)) {
        expect(typeCheck(String(fixed.value), '', fixed.lang === 'tsx').diagnostics).toEqual([]);
      } else if (fixed && fixed.lang !== 'jsx') {
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

/* ── TypeScript (PROMPT.md: TS exercises must have no type errors and pass the tests) ── */

const tsLessons = lessonFiles.filter(({ abs }) =>
  /<TS(Playground|Exercise)/.test(fs.readFileSync(abs, 'utf8')),
);

describe.each(tsLessons)('$course/$file TypeScript', ({ abs }) => {
  const tree = parser.parse(fs.readFileSync(abs, 'utf8')) as Node;

  const playgrounds = findAll(tree, 'TSPlayground');
  test.each(playgrounds.map((p, i) => ({ p, name: String(attr(p, 'file') ?? i) })))(
    'ts playground $name: type errors only where expected, and the expected output',
    async ({ p }) => {
      const file = String(attr(p, 'file') ?? 'example.ts');
      const tsx = file.endsWith('.tsx');
      const code = String(codeIn(p)[0]?.value ?? '');
      const errorLines = [...new Set(typeCheck(code, '', tsx).diagnostics.map((d) => d.line))];
      const want = ((attr(p, 'errors') as number[] | undefined) ?? [])
        .slice()
        .sort((a, b) => a - b);
      expect(errorLines.sort((a, b) => a - b)).toEqual(want);
      if (attr(p, 'checkOnly') === true || tsx) return;
      const expected = attr(p, 'expected') as string[] | undefined;
      expect(expected, 'a runnable TS playground needs expected output').toBeDefined();
      const out = await runToEnd(transpile(code), run);
      expect(out.status).toBe('done');
      expect(out.lines.map((l) => l.text)).toEqual(expected);
    },
  );

  const exercises = findAll(tree, 'TSExercise');
  test.each(exercises.map((e) => ({ e, id: String(attr(e, 'id')) })))(
    'ts exercise $id: the solution type-checks and passes; the starter does not',
    async ({ e }) => {
      const blocks = codeIn(e);
      const get = (word: string) => blocks.find((b) => (b.meta ?? '').split(/\s+/).includes(word));
      const starter = get('starter');
      const tsx = starter?.lang === 'tsx';
      const checks = String(get('types')?.value ?? '');
      const tests = String(get('tests')?.value ?? '');
      expect(checks || tests, 'needs type checks or tests').not.toBe('');
      const solution = String(get('solution')?.value ?? '');

      const solved = typeCheck(solution, checks, tsx).diagnostics;
      expect(solved).toEqual([]);
      if (tests && !tsx) {
        const result = await checkExercise(transpile(solution), tests, run);
        expect(result.problem).toBeUndefined();
        expect(result.passed).toBe(true);
      }

      const start = String(starter?.value ?? '');
      const starterTypeErrors = typeCheck(start, checks, tsx).diagnostics.length;
      const starterPasses =
        tests && !tsx ? (await checkExercise(transpile(start), tests, run)).passed : true;
      expect(starterTypeErrors > 0 || !starterPasses, 'the starter must not pass').toBe(true);
    },
  );
});
