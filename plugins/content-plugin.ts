import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { extractSearchDocs, parseFrontmatter } from '../src/search/extract.ts';
import type { LessonMeta } from '../src/content/types.ts';

const META_ID = 'virtual:lesson-meta';
const SEARCH_ID = 'virtual:search-docs';

/**
 * Reads every lesson file at build time and exposes two virtual modules:
 *  - virtual:lesson-meta  — small, eager: frontmatter of every lesson (titles, minutes…)
 *  - virtual:search-docs  — large, lazy: text + code for the search palette
 * Reading frontmatter through an eager import.meta.glob would pull every lesson body
 * into the main bundle, which is why this lives in a plugin.
 */
export function contentPlugin(): Plugin {
  let root = process.cwd();
  const contentDir = () => path.join(root, 'src', 'content', 'courses');

  function readLessons() {
    const dir = contentDir();
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

  return {
    name: 'eschool-content',
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === META_ID || id === SEARCH_ID) return '\0' + id;
      return undefined;
    },
    load(id) {
      if (id !== '\0' + META_ID && id !== '\0' + SEARCH_ID) return undefined;
      const lessons = readLessons();
      lessons.forEach((l) => this.addWatchFile(l.abs));
      const data =
        id === '\0' + META_ID
          ? lessons.map((l) => l.meta)
          : lessons.flatMap((l) => extractSearchDocs(l.source, l.meta));
      return `export default ${JSON.stringify(data)};`;
    },
    configureServer(server) {
      const onChange = (file: string) => {
        if (!file.endsWith('.mdx') || !path.resolve(file).startsWith(contentDir())) return;
        for (const id of [META_ID, SEARCH_ID]) {
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
