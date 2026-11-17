// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createNodeWorker } from '../../../test/nodeWorker';
import { runToEnd } from '@/runner/runCode';
import { parseReference } from './parse';

const data = parseReference(fs.readFileSync(path.resolve(__dirname, 'js-reference.txt'), 'utf8'));

describe('parseReference', () => {
  test('has the 10 original sections plus JavaScript in depth, and at least 78 entries', () => {
    expect(data.sections.map((s) => s.title)).toEqual([
      'Basics',
      'Conditions & loops',
      'Functions',
      'Arrays',
      'Objects',
      'Strings',
      'Async',
      'DOM & events',
      'Modules & extras',
      'Gotchas',
      'JavaScript in depth',
    ]);
    expect(data.entries.length).toBeGreaterThanOrEqual(78 + 18);
  });

  test('reads flags, notes, code and expected output', () => {
    const fetchOk = data.entries.find((e) => e.id === 'fetch-ok')!;
    expect(fetchOk).toMatchObject({
      section: 'async',
      react: true,
      warn: false,
      browserOnly: false,
    });
    expect(fetchOk.note).toBe('fetch is simulated in this playground.');
    expect(fetchOk.code).toContain('if (!res.ok)');
    const optional = data.entries.find((e) => e.id === 'optional-chaining')!;
    expect(optional.expected).toEqual([
      'undefined',
      "Uncaught TypeError: Cannot read properties of undefined (reading 'city')",
    ]);
    const listener = data.entries.find((e) => e.id === 'add-event-listener')!;
    expect(listener.browserOnly).toBe(true);
    expect(listener.expected).toEqual(['~ After clicking the button:', 'Added to cart']);
    const reference = data.entries.find((e) => e.id === 'reference-copy')!;
    expect(reference).toMatchObject({ warn: true, react: true });
  });

  test('rejects broken files', () => {
    expect(() => parseReference('@@ a :: nope :: A\n```\nx\n```')).toThrow(/unknown section/);
    expect(() => parseReference('# s :: S :: intro\n@@ a :: s :: A\n```\nx')).toThrow(
      /never closed/,
    );
    expect(() =>
      parseReference('# s :: S\n@@ a :: s :: A\n```\n1\n```\n@@ a :: s :: B\n```\n2\n```'),
    ).toThrow(/Duplicate/);
  });
});

describe('every runnable reference entry prints its expected output', () => {
  const runnable = data.entries.filter((e) => !e.browserOnly);
  test.each(runnable.map((e) => ({ e, id: e.id })))('$id', async ({ e }) => {
    const out = await runToEnd(e.code, { createWorker: createNodeWorker });
    expect(out.status).toBe('done');
    const lines = out.lines.map((l) => l.text);
    if (e.varies) {
      // Random numbers and dates: same number of lines, and no errors.
      expect(lines).toHaveLength(e.expected.length);
      expect(out.lines.every((l) => l.level !== 'error')).toBe(true);
    } else {
      expect(lines).toEqual(e.expected);
    }
  });
});
