export interface EditorSelection {
  value: string;
  start: number;
  end: number;
}

export interface KeyLike {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export type EditorAction =
  | { type: 'run' }
  | { type: 'edit'; from: number; to: number; text: string; selStart: number; selEnd: number }
  | { type: 'move'; selStart: number; selEnd: number }
  | null;

const PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};
const CLOSERS = new Set(Object.values(PAIRS));
const QUOTES = `"'\``;
const INDENT = '  ';

const edit = (from: number, to: number, text: string, selStart: number, selEnd = selStart) =>
  ({ type: 'edit', from, to, text, selStart, selEnd }) as const;

/**
 * Decides what a key press does in the code editor. Pure, so it can be unit tested;
 * the component applies the result with execCommand('insertText') to keep native undo.
 * Returns null when the browser should handle the key normally.
 */
export function editorKeyAction(sel: EditorSelection, key: KeyLike): EditorAction {
  const { value, start, end } = sel;
  const before = value[start - 1] ?? '';
  const after = value[start] ?? '';
  const mod = Boolean(key.ctrlKey || key.metaKey);

  if (key.key === 'Enter' && mod) return { type: 'run' };
  if (mod || key.altKey) return null;

  // Enter: keep the line's indentation; add one level after an opening bracket.
  if (key.key === 'Enter' && !key.shiftKey) {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const indent = /^[ \t]*/.exec(value.slice(lineStart, start))?.[0] ?? '';
    const opener = before !== '' && '([{'.includes(before);
    if (opener && start === end && after === PAIRS[before]) {
      const text = '\n' + indent + INDENT + '\n' + indent;
      return edit(start, end, text, start + 1 + indent.length + INDENT.length);
    }
    const text = '\n' + indent + (opener ? INDENT : '');
    return edit(start, end, text, start + text.length);
  }

  // Tab / Shift+Tab: indent or outdent by 2 spaces (every selected line).
  if (key.key === 'Tab') {
    const multiLine = value.slice(start, end).includes('\n');
    if (!key.shiftKey && !multiLine) return edit(start, end, INDENT, start + INDENT.length);
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const block = value.slice(lineStart, end);
    const lines = block.split('\n');
    const changed = key.shiftKey
      ? lines.map((l) => (l.startsWith(INDENT) ? l.slice(2) : l.startsWith(' ') ? l.slice(1) : l))
      : lines.map((l) => INDENT + l);
    const text = changed.join('\n');
    if (text === block) return { type: 'move', selStart: start, selEnd: end };
    const firstDelta = changed[0].length - lines[0].length;
    const selStart = Math.max(lineStart, start + firstDelta);
    const selEnd = start === end ? selStart : end + (text.length - block.length);
    return edit(lineStart, end, text, selStart, selEnd);
  }

  // Typing a closer right before the same closer steps over it.
  if (CLOSERS.has(key.key) && start === end && after === key.key) {
    return { type: 'move', selStart: start + 1, selEnd: start + 1 };
  }

  // Auto-close brackets and quotes (or wrap the selection).
  const close = PAIRS[key.key];
  if (close) {
    if (start !== end) {
      const selected = value.slice(start, end);
      return edit(start, end, key.key + selected + close, start + 1, end + 1);
    }
    if (QUOTES.includes(key.key) && /[\w$]/.test(before)) return null; // the ' in "can't"
    if (!after || /[\s)\]};,:]/.test(after)) return edit(start, end, key.key + close, start + 1);
    return null;
  }

  // Backspace inside an empty pair deletes both characters.
  if (key.key === 'Backspace' && start === end && before && after && PAIRS[before] === after) {
    return edit(start - 1, start + 1, '', start - 1);
  }

  return null;
}

/** Applies an edit to a textarea, keeping the browser's undo history when it can. */
export function applyEdit(
  textarea: HTMLTextAreaElement,
  action: Extract<EditorAction, { type: 'edit' }>,
  onFallback: (value: string) => void,
) {
  textarea.focus();
  textarea.setSelectionRange(action.from, action.to);
  let ok: boolean;
  try {
    if (action.text) ok = document.execCommand('insertText', false, action.text);
    else if (action.from !== action.to) ok = document.execCommand('delete');
    else ok = true;
  } catch {
    ok = false;
  }
  if (!ok) {
    textarea.setRangeText(action.text, action.from, action.to, 'end');
    onFallback(textarea.value);
  }
  textarea.setSelectionRange(action.selStart, action.selEnd);
}
