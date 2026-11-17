import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { extractSearchDocs, parseFrontmatter, referenceSearchDocs } from '../src/search/extract.ts';
import { parseReference } from '../src/content/reference/parse.ts';
import type { LessonMeta } from '../src/content/types.ts';

const META_ID = 'virtual:lesson-meta';
const SEARCH_ID = 'virtual:search-docs';
const REFERENCE_ID = 'virtual:reference';
const VIRTUAL = [META_ID, SEARCH_ID, REFERENCE_ID];

/**
 * Reads the content files at build time and exposes three virtual modules:
 *  - virtual:lesson-meta  — small, eager: frontmatter of every lesson (titles, minutes…)
 *  - virtual:search-docs  — large, lazy: text + code of lessons and the reference, for search
 *  - virtual:reference    — lazy: the JS Quick Reference entries, for /reference
 * Reading frontmatter through an eager import.meta.glob would pull every lesson body
 * into the main bundle, which is why this lives in a plugin.
 */
export function contentPlugin(): Plugin {
  let root = process.cwd();
  const contentDir = () => path.join(root, 'src', 'content');
  const referenceFile = () => path.join(contentDir(), 'reference', 'js-reference.txt');

  function readLessons() {
    const dir = path.join(contentDir(), 'courses');
    if (!fs.existsSync(dir)) return [];
    const lessons: { meta: LessonMeta; source: string; abs: string }[] = [];
    for (const course of fs.readdirSync(dir).sort()) {
      const courseDir = path.join(dir, course);
      if (!fs.statSync(courseDir).isDirectory()) continue;
      for (const file of fs.readdirSync(courseDir).sort()) {
        if (!file.endsWith('.mdx')) continue;
        const abs = path.join(courseDir, file);
        const source = fs.readFileSync(abs, 'utf8');
        const fm = parseFrontmatter(source, `${course}/${file}`);
        const rel = '/' + path.relative(root, abs).split(path.sep).join('/');
        lessons.push({ meta: { ...fm, course, file: rel }, source, abs });
      }
    }
    return lessons;
  }

  function readReference() {
    return parseReference(fs.readFileSync(referenceFile(), 'utf8'));
  }

  return {
    name: 'eschool-content',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      return VIRTUAL.includes(id) ? '\0' + id : undefined;
    },
    load(id) {
      if (!id.startsWith('\0') || !VIRTUAL.includes(id.slice(1))) return undefined;
      if (id === '\0' + REFERENCE_ID) {
        this.addWatchFile(referenceFile());
        return `export default ${JSON.stringify(readReference())};`;
      }
      const lessons = readLessons();
      lessons.forEach((l) => this.addWatchFile(l.abs));
      if (id === '\0' + META_ID) {
        return `export default ${JSON.stringify(lessons.map((l) => l.meta))};`;
      }
      this.addWatchFile(referenceFile());
      const docs = [
        ...lessons.flatMap((l) => extractSearchDocs(l.source, l.meta)),
        ...referenceSearchDocs(readReference()),
      ];
      return `export default ${JSON.stringify(docs)};`;
    },
    configureServer(server) {
      const onChange = (file: string) => {
        const abs = path.resolve(file);
        if (!/\.(mdx|txt)$/.test(abs) || !abs.startsWith(contentDir())) return;
        for (const id of VIRTUAL) {
          const mod = server.moduleGraph.getModuleById('\0' + id);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}
