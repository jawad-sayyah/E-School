// Authoring helper for MiniShop steps (src/content/courses/minishop). The code a step finishes
// with is the starter code of the next one, so instead of copying a dozen files by hand:
//   node scripts/minishop-starter.mjs <step.mdx> <previous-step.mdx>
//     replaces each "%%STARTER%%" line with ```lang starter file=…``` blocks for every file of the
//     previous step's finished code that the component does not define itself;
//   node scripts/minishop-starter.mjs <step.mdx> <step.mdx>
//     replaces each "%%CODE:/a.ts,/b.tsx%%" line with ```lang code file=…``` blocks of this
//     step's own finished code (for a "Test it" ReactTestExercise).
// The content tests check the result ("starts from the previous step's finished code").
import fs from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter, ['yaml']);
const [target, prev] = process.argv.slice(2);

const fileOf = (meta = '') => /(?:^|\s)file=(\S+)/.exec(meta)?.[1];
const has = (b, w) => (b.meta ?? '').split(/\s+/).includes(w);
function walk(node, names, out = []) {
  if (node.type === 'mdxJsxFlowElement' && names.includes(node.name)) out.push(node);
  node.children?.forEach((c) => walk(c, names, out));
  return out;
}
const attrTrue = (n, name) => n.attributes?.some((a) => a.name === name);

function finalOf(mdx) {
  const tree = parser.parse(fs.readFileSync(mdx, 'utf8'));
  const code = walk(tree, ['ProjectStep', 'ReactExercise', 'ReactPlayground']).filter(
    (n) => n.name !== 'ReactPlayground' || attrTrue(n, 'final'),
  );
  const last = code.at(-1);
  if (!last) return null;
  const blocks = (last.children ?? []).filter((c) => c.type === 'code');
  const files = new Map();
  const pick = (b) => files.set(fileOf(b.meta), { lang: b.lang, code: b.value });
  if (last.name === 'ReactPlayground') blocks.forEach(pick);
  else {
    blocks.filter((b) => has(b, 'starter')).forEach(pick);
    blocks.filter((b) => has(b, 'solution')).forEach(pick);
  }
  return files;
}

const files = finalOf(prev);
let src = fs.readFileSync(target, 'utf8');
const fence = (lang, word, file, code) => `\`\`\`${lang} ${word} file=${file}\n${code}\n\`\`\`\n`;

// Each marker belongs to the component it sits in: skip files that component already defines.
const self = target === prev;
if (!self)
  src = src.replace(/^%%STARTER%%$/gm, (m, offset) => {
    const start = src.lastIndexOf('\n<', offset);
    const end = src.indexOf('\n</', offset);
    const own = new Set(
      [...src.slice(start, end).matchAll(/^```\w+ [^\n]*starter[^\n]*file=(\S+)/gm)].map(
        (x) => x[1],
      ),
    );
    return [...files]
      .filter(([file]) => !own.has(file))
      .map(([file, { lang, code }]) => fence(lang, 'starter', file, code))
      .join('\n')
      .trimEnd();
  });
// A step without code of its own (like "Test MiniShop") tests the previous step's code.
const codeFiles = finalOf(target) ?? files;
if (self || !finalOf(target))
  src = src.replace(/^%%CODE:([^%]+)%%$/gm, (m, list) =>
    list
      .split(',')
      .map((file) => {
        const f = codeFiles.get(file.trim());
        if (!f) throw new Error(`no ${file} in ${prev}`);
        return fence(f.lang, 'code', file.trim(), f.code);
      })
      .join('\n')
      .trimEnd(),
  );
fs.writeFileSync(target, src);
console.log(`injected from ${prev}: ${[...files.keys()].join(' ')}`);
