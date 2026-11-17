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

describe.each(lessonFiles)('$course/$file', ({ abs }) => {
  const source = fs.readFileSync(abs, 'utf8');
  const tree = parser.parse(source) as Node;

  test('has a quiz with valid answers and at least one exercise', () => {
    const quizzes = findAll(tree, 'Quiz');
    expect(quizzes).toHaveLength(1);
    const questions = attr(quizzes[0], 'questions') as { options: string[]; answer: number }[];
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(5);
    for (const q of questions) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
    expect(findAll(tree, 'Exercise').length).toBeGreaterThanOrEqual(1);
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
