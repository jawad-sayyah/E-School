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
import { catchesBug } from './catches-bug.mjs';

const ROOT = path.resolve('src/content/courses');
const PACKAGES = JSON.parse(fs.readFileSync('src/components/react/packages.json', 'utf8'));
// "vitest" is provided in Sandpack by a small hidden shim (VITEST_SHIM in src/components/react/sandboxFiles.ts)
const KNOWN = new Set([...Object.keys(PACKAGES.base), ...Object.keys(PACKAGES.optional), 'vitest']);
const OUT = path.resolve('test/react-exercises');
// Buggy versions of write-the-tests components: a separate Vitest project (see vite.config.ts)
const BUGS_OUT = path.resolve('test/react-bugs');
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

/** Sandpack can only install the packages in packages.json, so lessons may import nothing else. */
function checkImports(where, files) {
  for (const [file, code] of Object.entries(files)) {
    for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"'./][^"']*)["']/g)) {
      const parts = m[1].split('/');
      const name = m[1].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (!KNOWN.has(name)) {
        throw new Error(`${where} ${file}: "${name}" isn't in src/components/react/packages.json`);
      }
    }
  }
}

function write(dir, files) {
  checkImports(path.basename(dir), files);
  // Windows and macOS disks ignore case: /Cart.js and /cart.js would overwrite each other.
  const seen = new Map();
  for (const file of Object.keys(files)) {
    const key = file.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`${path.basename(dir)}: ${seen.get(key)} and ${file} differ only in case`);
    }
    seen.set(key, file);
  }
  for (const [file, code] of Object.entries(files)) {
    const out = path.join(dir, jsx(file).slice(1));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, code);
  }
}

const cleanTests = (code) =>
  code.replace(
    /^\s*import\s+["']@testing-library\/jest-dom["'];?\s*$/gm,
    '// jest-dom is set up globally',
  );

fs.rmSync(OUT, { recursive: true, force: true });
fs.rmSync(BUGS_OUT, { recursive: true, force: true });
let exercises = 0;
let playgrounds = 0;

for (const course of fs.readdirSync(ROOT)) {
  for (const file of fs.readdirSync(path.join(ROOT, course))) {
    if (!file.endsWith('.mdx')) continue;
    const tree = parser.parse(fs.readFileSync(path.join(ROOT, course, file), 'utf8'));
    const lesson = file.replace(/\.mdx$/, '');

    for (const ex of findAll(tree, ['ReactExercise', 'BuildUI', 'ProjectStep'])) {
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
      if (Object.values(tests).some((c) => c.includes('@testing-library/user-event'))) {
        // Sandpack's test runner crashes on user-event v14 ("not of type 'Element'").
        throw new Error(
          `${course}/${file} (${attr(ex, 'id')}): use fireEvent, not user-event, in Sandpack tests`,
        );
      }
      const dir = path.join(OUT, `${course}--${lesson}--${attr(ex, 'id')}`);
      write(dir, { ...pick('starter'), ...pick('solution'), ...tests });
      exercises++;
    }

    // Write-the-tests: the example tests must pass on the real component, and every buggy
    // version must make at least one of them fail (checked by a wrapper test).
    for (const ex of findAll(tree, ['ReactTestExercise'])) {
      const blocks = (ex.children ?? []).filter((c) => c.type === 'code');
      const has = (b, word) => (b.meta ?? '').split(/\s+/).includes(word);
      const code = Object.fromEntries(
        blocks.filter((b) => has(b, 'code')).map((b) => [fileName(b), b.value]),
      );
      const solutionBlock = blocks.find((b) => has(b, 'solution'));
      const testFile = fileName(solutionBlock, '/App.test.js');
      const solution = cleanTests(solutionBlock.value);
      if (solution.includes('@testing-library/user-event')) {
        throw new Error(`${course}/${file} (${attr(ex, 'id')}): use fireEvent, not user-event`);
      }
      const bugs = blocks.filter((b) => has(b, 'bug'));
      if (bugs.length < 3) throw new Error(`${course}/${file} (${attr(ex, 'id')}): needs 3+ bugs`);
      const base = `${course}--${lesson}--${attr(ex, 'id')}`;
      write(path.join(OUT, base), { ...code, [testFile]: solution });
      bugs.forEach((bug, i) => {
        const title = /title="([^"]*)"/.exec(bug.meta ?? '')?.[1] ?? `bug ${i + 1}`;
        write(path.join(BUGS_OUT, `${base}--bug-${i + 1}`), {
          ...code,
          [fileName(bug)]: bug.value,
          [testFile]: catchesBug(solution, title),
        });
      });
      exercises++;
    }

    findAll(tree, ['ReactPlayground']).forEach((pg, i) => {
      const blocks = (pg.children ?? []).filter((c) => c.type === 'code');
      const vanilla = attr(pg, 'template') === 'vanilla';
      const files = Object.fromEntries(
        blocks.map((b) => [fileName(b, vanilla ? '/index.js' : '/App.js'), b.value]),
      );
      const dir = path.join(OUT, `${course}--${lesson}--playground-${i + 1}`);
      if (vanilla) {
        // Plain JS: put the page's <body> into jsdom, then run index.js against it.
        const body = (files['/index.html'] ?? '')
          .replace(/^[\s\S]*<body[^>]*>|<\/body>[\s\S]*$/g, '')
          .replace(/<script[\s\S]*?<\/script>/g, '');
        write(dir, {
          ...files,
          '/smoke.test.js': [
            "test('runs without errors', async () => {",
            `  document.body.innerHTML = ${JSON.stringify(body)};`,
            "  await import('./index.jsx');",
            '});',
            '',
          ].join('\n'),
        });
        playgrounds++;
        return;
      }
      if (!files['/App.js'] && !files['/App.tsx']) return;
      write(dir, {
        ...files,
        '/smoke.test.jsx': [
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
