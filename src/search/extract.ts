import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import { parse as parseYaml } from 'yaml';
import { slugify } from '../lib/slug.ts';
import type { LessonMeta, SearchDoc } from '../content/types.ts';

/* Runs at build time (inside the Vite plugin) and in unit tests. No browser APIs here. */

interface AnyNode {
  type: string;
  name?: string | null;
  value?: unknown;
  meta?: string | null;
  attributes?: { type: string; name?: string; value?: unknown }[];
  children?: AnyNode[];
}

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkFrontmatter, ['yaml']);

export type Frontmatter = Omit<LessonMeta, 'course' | 'file'>;

export function parseFrontmatter(source: string, fileForErrors = 'lesson'): Frontmatter {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) throw new Error(`${fileForErrors}: missing frontmatter`);
  const data = (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
  const id = data.id;
  const title = data.title;
  if (typeof id !== 'string' || typeof title !== 'string') {
    throw new Error(`${fileForErrors}: frontmatter needs "id" and "title"`);
  }
  return {
    id,
    title,
    summary: typeof data.summary === 'string' ? data.summary : '',
    minutes: typeof data.minutes === 'number' ? data.minutes : 10,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  };
}

function attr(node: AnyNode, name: string): string | undefined {
  const found = node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name);
  if (!found) return undefined;
  return typeof found.value === 'string' ? found.value : '';
}

/** Code fences that would spoil an exercise if they showed up in search. */
const HIDDEN_FENCES = /\b(tests|solution)\b/;

interface Bucket {
  title: string;
  anchor?: string;
  text: string[];
  code: string[];
}

/** Splits a lesson into one doc for the lesson and one per <Concept>. */
export function extractSearchDocs(source: string, meta: LessonMeta): SearchDoc[] {
  const tree = processor.parse(source) as AnyNode;
  const lessonBucket: Bucket = { title: meta.title, text: [meta.summary], code: [] };
  const concepts: Bucket[] = [];

  const walk = (node: AnyNode, bucket: Bucket) => {
    switch (node.type) {
      case 'yaml':
      case 'mdxjsEsm':
      case 'mdxFlowExpression':
      case 'mdxTextExpression':
        return;
      case 'text':
      case 'inlineCode':
        if (typeof node.value === 'string') bucket.text.push(node.value);
        return;
      case 'code':
        if (!HIDDEN_FENCES.test(node.meta ?? '') && typeof node.value === 'string') {
          bucket.code.push(node.value);
        }
        return;
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      if (node.name === 'Concept') {
        const name = attr(node, 'name') ?? 'Concept';
        const concept: Bucket = {
          title: name,
          anchor: attr(node, 'id') || slugify(name),
          text: [],
          code: [],
        };
        concepts.push(concept);
        node.children?.forEach((child) => walk(child, concept));
        return;
      }
      const title = attr(node, 'title');
      if (title) bucket.text.push(title);
    }
    node.children?.forEach((child) => walk(child, bucket));
  };
  walk(tree, lessonBucket);

  const base = { course: meta.course, lesson: meta.id, lessonTitle: meta.title };
  const squash = (parts: string[]) => parts.join(' ').replace(/\s+/g, ' ').trim();
  return [
    {
      ...base,
      id: `${meta.course}/${meta.id}`,
      kind: 'lesson',
      title: meta.title,
      tags: meta.tags.join(' '),
      text: squash(lessonBucket.text),
      code: lessonBucket.code.join('\n'),
    },
    ...concepts.map((c): SearchDoc => ({
      ...base,
      id: `${meta.course}/${meta.id}#${c.anchor}`,
      kind: 'concept',
      title: c.title,
      anchor: c.anchor,
      tags: meta.tags.join(' '),
      text: squash(c.text),
      code: c.code.join('\n'),
    })),
  ];
}
