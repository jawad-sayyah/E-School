/**
 * The inline Markdown that plain strings (quiz text, hints, tasks) may use:
 * `code`, ``code with a ` inside`` (like Markdown, one space of padding is trimmed),
 * and **bold**, which may contain code.
 */
const INLINE = /(``.+?``|`[^`]+`|\*\*.+?\*\*)/g;

export function inlineParts(text: string): { kind: 'text' | 'code' | 'bold'; value: string }[] {
  return text
    .split(INLINE)
    .filter((part) => part !== '')
    .map((part) => {
      if (part.length > 4 && part.startsWith('``') && part.endsWith('``')) {
        return { kind: 'code', value: part.slice(2, -2).replace(/^ (.*) $/, '$1') };
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return { kind: 'code', value: part.slice(1, -1) };
      }
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return { kind: 'bold', value: part.slice(2, -2) };
      }
      return { kind: 'text', value: part };
    });
}
