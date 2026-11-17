// Turns every <ReactExercise>, <BuildUI> and <ReactPlayground> in the lessons into real
// Vitest + Testing Library tests under test/react-exercises/ (generated, git-ignored):
//  - exercises: the SOLUTION files plus the hidden tests → the solution must pass them
//  - playgrounds: a smoke test that renders the App without throwing
import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';

const ROOT = path.resolve('src/content/courses');
const OUT = path.resolve('test/react-exercises');
const parser = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter, ['yaml']);

const attr = (node, name) => {
  const a = node.attributes?.find((x) => x.name === name);
  return typeof a?.value === 'string' ? a.value : undefined;
};

function findAll(node, names, out = []) {
  if (node.type === 'mdxJsxFlowElement' && names.includes(node.name)) out.push(node);
  node.children?.forEach((c) => findAll(c, names, out));
  return out;
}

function fileName(block, fallback = '/App.js') {
  const named = /(?:^|\s)file=(\S+)/.exec(block.meta ?? '')?.[1];
  if (named) return named.startsWith('/') ? named : `/${named}`;
  if (block.lang === 'css') return '/styles.css';
  return fallback;
}

/** Sandpack files are .js with JSX inside; Vite wants .jsx for that. */
const jsx = (file) => file.replace(/\.js$/, '.jsx');

function write(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, code] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, jsx(file).slice(1)), code);
  }
}

const cleanTests = (code) =>
  code.replace(
    /^\s*import\s+["']@testing-library\/jest-dom["'];?\s*$/gm,
    '// jest-dom is set up globally',
  );

fs.rmSync(OUT, { recursive: true, force: true });
let exercises = 0;
let playgrounds = 0;

for (const course of fs.readdirSync(ROOT)) {
  for (const file of fs.readdirSync(path.join(ROOT, course))) {
    if (!file.endsWith('.mdx')) continue;
    const tree = parser.parse(fs.readFileSync(path.join(ROOT, course, file), 'utf8'));
    const lesson = file.replace(/\.mdx$/, '');

    for (const ex of findAll(tree, ['ReactExercise', 'BuildUI'])) {
      const blocks = (ex.children ?? []).filter((c) => c.type === 'code');
      const pick = (word) =>
        Object.fromEntries(
          blocks
            .filter((b) => (b.meta ?? '').split(/\s+/).includes(word))
            .map((b) => [fileName(b), b.value]),
        );
      const tests = Object.fromEntries(
        Object.entries(pick('tests')).map(([f, c]) => [f, cleanTests(c)]),
      );
      const dir = path.join(OUT, `${course}--${lesson}--${attr(ex, 'id')}`);
      write(dir, { ...pick('starter'), ...pick('solution'), ...tests });
      exercises++;
    }

    findAll(tree, ['ReactPlayground']).forEach((pg, i) => {
      const blocks = (pg.children ?? []).filter((c) => c.type === 'code');
      const files = Object.fromEntries(blocks.map((b) => [fileName(b), b.value]));
      if (!files['/App.js']) return;
      const dir = path.join(OUT, `${course}--${lesson}--playground-${i + 1}`);
      write(dir, {
        ...files,
        '/smoke.test.js': [
          "import { render } from '@testing-library/react';",
          "import App from './App';",
          '',
          "test('renders without crashing', () => {",
          '  render(<App />);',
          '});',
          '',
        ].join('\n'),
      });
      playgrounds++;
    });
  }
}

console.log(`Generated tests for ${exercises} React exercises and ${playgrounds} playgrounds.`);
