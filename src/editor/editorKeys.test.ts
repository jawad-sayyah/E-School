// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { editorKeyAction, type EditorAction } from './editorKeys';

/** "|" marks the caret, "«" and "»" mark a selection. */
function state(text: string) {
  const sel = text.indexOf('«');
  if (sel >= 0) {
    const end = text.indexOf('»');
    return { value: text.replace('«', '').replace('»', ''), start: sel, end: end - 1 };
  }
  const caret = text.indexOf('|');
  return { value: text.replace('|', ''), start: caret, end: caret };
}

/** Applies the action and shows the result with the caret as "|". */
function press(text: string, key: string, mods: { shift?: boolean; ctrl?: boolean } = {}) {
  const s = state(text);
  const action: EditorAction = editorKeyAction(s, {
    key,
    shiftKey: mods.shift,
    ctrlKey: mods.ctrl,
  });
  if (!action || action.type === 'run') return action;
  const value =
    action.type === 'edit'
      ? s.value.slice(0, action.from) + action.text + s.value.slice(action.to)
      : s.value;
  if (action.selStart === action.selEnd) {
    return value.slice(0, action.selStart) + '|' + value.slice(action.selStart);
  }
  return (
    value.slice(0, action.selStart) +
    '«' +
    value.slice(action.selStart, action.selEnd) +
    '»' +
    value.slice(action.selEnd)
  );
}

describe('editorKeyAction', () => {
  test('Enter keeps the indentation', () => {
    expect(press('  const a = 1;|', 'Enter')).toBe('  const a = 1;\n  |');
  });

  test('Enter adds a level after { ( [', () => {
    expect(press('if (x) {|', 'Enter')).toBe('if (x) {\n  |');
    expect(press('const list = [|', 'Enter')).toBe('const list = [\n  |');
  });

  test('Enter between a pair puts the closer on its own line', () => {
    expect(press('  fn(() => {|})', 'Enter')).toBe('  fn(() => {\n    |\n  })');
  });

  test('brackets and quotes auto-close', () => {
    expect(press('log|', '(')).toBe('log(|)');
    expect(press('const s = |', '"')).toBe('const s = "|"');
    expect(press('x = |;', '[')).toBe('x = [|];');
  });

  test('no auto-close before a word or for an apostrophe', () => {
    expect(press('|abc', '(')).toBeNull();
    expect(press('can|', "'")).toBeNull();
  });

  test('typing a closer that is already there steps over it', () => {
    expect(press('log(1|)', ')')).toBe('log(1)|');
    expect(press('"hi|"', '"')).toBe('"hi"|');
  });

  test('a selection gets wrapped', () => {
    expect(press('«name»', '"')).toBe('"«name»"');
  });

  test('Backspace in an empty pair deletes both', () => {
    expect(press('log(|)', 'Backspace')).toBe('log|');
    expect(press('log(a|)', 'Backspace')).toBeNull();
  });

  test('Tab indents by 2 spaces, Shift+Tab outdents', () => {
    expect(press('|x', 'Tab')).toBe('  |x');
    expect(press('    x|', 'Tab', { shift: true })).toBe('  x|');
    expect(press('x|', 'Tab', { shift: true })).toBe('x|');
  });

  test('Tab and Shift+Tab work on several selected lines', () => {
    expect(press('«a\nb»', 'Tab')).toBe('  «a\n  b»');
    expect(press('  «a\n  b»', 'Tab', { shift: true })).toBe('«a\nb»');
  });

  test('Ctrl+Enter runs', () => {
    expect(press('x|', 'Enter', { ctrl: true })).toEqual({ type: 'run' });
  });

  test('other keys are left to the browser', () => {
    expect(press('x|', 'a')).toBeNull();
    expect(press('x|', 'z', { ctrl: true })).toBeNull();
  });
});
