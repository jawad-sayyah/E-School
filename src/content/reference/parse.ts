/* Parses src/content/reference/js-reference.txt. Runs at build time and in tests. */

export interface ReferenceSection {
  id: string;
  title: string;
  intro: string;
}

export interface ReferenceEntry {
  id: string;
  section: string;
  name: string;
  react: boolean;
  warn: boolean;
  /** Needs a real web page (DOM, import/export): shown without a Run button. */
  browserOnly: boolean;
  /** Output changes from run to run (random numbers, dates). */
  varies: boolean;
  desc: string;
  note?: string;
  code: string;
  /** Expected console lines, in <Playground expected> format ("Uncaught …", "~ note"). */
  expected: string[];
}

export interface ReferenceData {
  sections: ReferenceSection[];
  entries: ReferenceEntry[];
}

export function parseReference(text: string): ReferenceData {
  const sections: ReferenceSection[] = [];
  const entries: ReferenceEntry[] = [];
  let current: ReferenceEntry | null = null;
  let inCode = false;
  let code: string[] = [];

  text
    .replace(/\r/g, '')
    .split('\n')
    .forEach((line, i) => {
      const where = `js-reference.txt line ${i + 1}`;
      if (inCode) {
        if (line.trim() === '```') {
          current!.code = code.join('\n');
          inCode = false;
          code = [];
        } else code.push(line);
        return;
      }
      if (line.startsWith('# ')) {
        const [id, title, intro = ''] = line
          .slice(2)
          .split(' :: ')
          .map((s) => s.trim());
        if (!id || !title) throw new Error(`${where}: a section needs "# id :: Title :: intro"`);
        sections.push({ id, title, intro });
        current = null;
        return;
      }
      if (line.startsWith('@@ ')) {
        const [id, section, name, flags = ''] = line
          .slice(3)
          .split(' :: ')
          .map((s) => s.trim());
        if (!id || !section || !name) {
          throw new Error(`${where}: an entry needs "@@ id :: section :: Name"`);
        }
        const has = (flag: string) => new RegExp(`\\b${flag}\\b`).test(flags);
        current = {
          id,
          section,
          name,
          react: has('react'),
          warn: has('warn'),
          browserOnly: has('static'),
          varies: has('varies'),
          desc: '',
          code: '',
          expected: [],
        };
        entries.push(current);
        return;
      }
      if (!current) return;
      if (line.trim() === '```') inCode = true;
      else if (line.startsWith('>> ')) current.expected.push(line.slice(3));
      else if (line.startsWith('!! ')) current.expected.push(`Uncaught ${line.slice(3)}`);
      else if (line.startsWith('~~ ')) current.expected.push(`~ ${line.slice(3)}`);
      else if (line.startsWith('note: ')) current.note = line.slice(6).trim();
      else if (line.trim()) current.desc += (current.desc ? ' ' : '') + line.trim();
    });

  if (inCode) throw new Error('js-reference.txt: a code block is never closed');
  const sectionIds = new Set(sections.map((s) => s.id));
  const seen = new Set<string>();
  for (const e of entries) {
    if (!sectionIds.has(e.section))
      throw new Error(`Entry "${e.id}" uses unknown section "${e.section}"`);
    if (seen.has(e.id)) throw new Error(`Duplicate reference entry id "${e.id}"`);
    if (!e.code) throw new Error(`Entry "${e.id}" has no code`);
    seen.add(e.id);
  }
  return { sections, entries };
}
