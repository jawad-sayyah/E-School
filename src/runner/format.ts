/**
 * Formats console.log arguments the way Node and devtools do:
 *   [ 8, 6, 10 ]   { name: 'Coffee', qty: 2 }   top-level strings raw, nested strings quoted.
 *
 * IMPORTANT: this function is injected into the worker with `formatLine.toString()`,
 * so it must stay completely self-contained: no imports, no helpers outside its body.
 */
export function formatLine(
  args: unknown[],
  limits: { MAX_ITEMS: number; MAX_CHARS: number },
  quoteTopStrings = false,
): string {
  const MAX_DEPTH = 2;
  const ident = /^[A-Za-z_$][\w$]*$/;

  const quote = (s: string): string => {
    const clipped = s.length > limits.MAX_CHARS ? s.slice(0, limits.MAX_CHARS) + '…' : s;
    const escaped = clipped.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    if (!escaped.includes("'")) return "'" + escaped + "'";
    if (!escaped.includes('"')) return '"' + escaped + '"';
    return '`' + escaped.replace(/`/g, '\\`') + '`';
  };

  const more = (n: number) => '… ' + n + ' more item' + (n === 1 ? '' : 's');

  const fmt = (v: unknown, depth: number, seen: unknown[]): string => {
    if (typeof v === 'string') return quote(v);
    if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
    if (typeof v === 'bigint') return String(v) + 'n';
    if (typeof v === 'symbol') return v.toString();
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'boolean') return String(v);
    if (typeof v === 'function') {
      const src = Function.prototype.toString.call(v);
      if (/^class\b/.test(src)) return '[class ' + (v.name || '(anonymous)') + ']';
      return v.name ? '[Function: ' + v.name + ']' : '[Function (anonymous)]';
    }
    if (typeof v !== 'object') return String(v);
    if (seen.includes(v)) return '[Circular]';
    if (v instanceof Error) {
      const text = v.name + ': ' + v.message;
      return depth === 0 ? text : '[' + text + ']';
    }
    if (v instanceof Date) return isNaN(v.getTime()) ? 'Invalid Date' : v.toISOString();
    if (v instanceof RegExp) return String(v);
    if (typeof Promise !== 'undefined' && v instanceof Promise) return 'Promise { <pending> }';

    const inner = [...seen, v];
    if (Array.isArray(v)) {
      if (depth > MAX_DEPTH) return '[Array]';
      if (v.length === 0) return '[]';
      const shown: string[] = [];
      const count = Math.min(v.length, limits.MAX_ITEMS);
      for (let i = 0; i < count; i++) shown.push(fmt(v[i], depth + 1, inner));
      if (v.length > limits.MAX_ITEMS) shown.push(more(v.length - limits.MAX_ITEMS));
      return '[ ' + shown.join(', ') + ' ]';
    }
    if (v instanceof Map || v instanceof Set) {
      const kind = v instanceof Map ? 'Map' : 'Set';
      if (depth > MAX_DEPTH) return '[' + kind + ']';
      if (v.size === 0) return kind + '(0) {}';
      const shown: string[] = [];
      let i = 0;
      for (const entry of v instanceof Map ? v.entries() : v.values()) {
        if (i++ >= limits.MAX_ITEMS) break;
        shown.push(
          v instanceof Map
            ? fmt((entry as [unknown, unknown])[0], depth + 1, inner) +
                ' => ' +
                fmt((entry as [unknown, unknown])[1], depth + 1, inner)
            : fmt(entry, depth + 1, inner),
        );
      }
      if (v.size > limits.MAX_ITEMS) shown.push(more(v.size - limits.MAX_ITEMS));
      return kind + '(' + v.size + ') { ' + shown.join(', ') + ' }';
    }

    const proto = Object.getPrototypeOf(v);
    const ctor = proto && proto.constructor && proto.constructor.name;
    const prefix =
      proto === null ? '[Object: null prototype] ' : ctor && ctor !== 'Object' ? ctor + ' ' : '';
    if (depth > MAX_DEPTH) return prefix ? '[' + prefix.trim() + ']' : '[Object]';
    const keys = Object.keys(v);
    if (keys.length === 0) return prefix + '{}';
    const shown: string[] = [];
    for (const key of keys.slice(0, limits.MAX_ITEMS)) {
      let value: string;
      try {
        value = fmt((v as Record<string, unknown>)[key], depth + 1, inner);
      } catch {
        value = '[Getter]';
      }
      shown.push((ident.test(key) ? key : quote(key)) + ': ' + value);
    }
    if (keys.length > limits.MAX_ITEMS) shown.push(more(keys.length - limits.MAX_ITEMS));
    return prefix + '{ ' + shown.join(', ') + ' }';
  };

  const text = args
    .map((a) => (typeof a === 'string' && !quoteTopStrings ? a : fmt(a, 0, [])))
    .join(' ');
  if (text.length <= limits.MAX_CHARS) return text;
  return (
    text.slice(0, limits.MAX_CHARS) + ' … (' + (text.length - limits.MAX_CHARS) + ' more characters)'
  );
}
