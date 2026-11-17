// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { LessonMeta, SearchDoc } from '@/content/types';
import { extractSearchDocs, parseFrontmatter } from './extract';
import { createSearchIndex, searchGrouped } from './searchIndex';

const SAMPLE = `---
id: arrays-methods
title: Arrays II
summary: Total a cart with reduce.
minutes: 12
tags: [arrays, reduce]
---

Intro text about lists.

<Concept name="reduce()" react>

Combines all items into a single value.

\`\`\`js
const total = prices.reduce((sum, p) => sum + p, 0);
\`\`\`

</Concept>

<Concept name={'"5" + 1'} id="string-plus" warn>

Joins text instead of adding.

</Concept>

<Exercise id="get-total" title="The cart total">

Write getTotal.

\`\`\`js starter
function getTotal(cart) {}
\`\`\`

\`\`\`js solution
function getTotal(cart) { return SECRET_SOLUTION; }
\`\`\`

</Exercise>
`;

const meta = (): LessonMeta => ({
  ...parseFrontmatter(SAMPLE),
  course: 'js-basics',
  file: '/src/content/courses/js-basics/08-arrays-methods.mdx',
});

describe('extractSearchDocs', () => {
  const docs = extractSearchDocs(SAMPLE, meta());

  test('makes one doc for the lesson and one per concept', () => {
    expect(docs.map((d) => [d.kind, d.title, d.anchor])).toEqual([
      ['lesson', 'Arrays II', undefined],
      ['concept', 'reduce()', 'reduce'],
      ['concept', '"5" + 1', 'string-plus'],
    ]);
  });

  test('indexes concept text and code', () => {
    const reduce = docs[1];
    expect(reduce.text).toContain('Combines all items');
    expect(reduce.code).toContain('prices.reduce');
    expect(reduce.id).toBe('js-basics/arrays-methods#reduce');
  });

  test('keeps exercise solutions and tests out of search', () => {
    const all = docs.map((d) => d.code + d.text).join(' ');
    expect(all).not.toContain('SECRET_SOLUTION');
    expect(all).toContain('function getTotal(cart) {}');
    expect(docs[0].text).toContain('The cart total');
  });

  test('frontmatter must have id and title', () => {
    expect(() => parseFrontmatter('---\ntitle: x\n---\n', 'bad.mdx')).toThrow(/id/);
    expect(() => parseFrontmatter('no frontmatter', 'bad.mdx')).toThrow(/frontmatter/);
  });
});

describe('search over the real course content', () => {
  const root = path.resolve(__dirname, '../content/courses');
  const docs: SearchDoc[] = fs.readdirSync(root).flatMap((course) =>
    fs
      .readdirSync(path.join(root, course))
      .filter((f) => f.endsWith('.mdx'))
      .flatMap((file) => {
        const source = fs.readFileSync(path.join(root, course, file), 'utf8');
        return extractSearchDocs(source, {
          ...parseFrontmatter(source, file),
          course,
          file: `/src/content/courses/${course}/${file}`,
        });
      }),
  );
  const index = createSearchIndex(docs);

  test('"reduce" finds the reduce() concept first, with its anchor', () => {
    const groups = searchGrouped(index, 'reduce');
    expect(groups[0].courseTitle).toBe('JavaScript Basics');
    expect(groups[0].hits[0]).toMatchObject({
      title: 'reduce()',
      url: '/courses/js-basics/arrays-methods#reduce',
    });
  });

  test('matches lesson titles, tags and prefixes', () => {
    expect(searchGrouped(index, 'closures')[0].hits[0].url).toContain('/callbacks-closures');
    expect(
      searchGrouped(index, 'templ')[0].hits.some((h) => h.anchor === 'template-literals'),
    ).toBe(true);
  });

  test('an empty query returns nothing', () => {
    expect(searchGrouped(index, '   ')).toEqual([]);
  });
});
