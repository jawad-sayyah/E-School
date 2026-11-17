export type TokenKind = 'kw' | 'str' | 'num' | 'fn' | 'prop' | 'tag' | 'cm' | 'plain';

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS =
  'const|let|var|function|return|if|else|for|while|do|of|in|async|await|new|try|catch|finally|throw|import|export|from|default|typeof|instanceof|null|undefined|true|false|class|extends|this|switch|case|break|continue|delete|void';

const PATTERN = new RegExp(
  '(\\/\\/.*$|\\/\\*[\\s\\S]*?\\*\\/)' + // 1 comment
    '|(`(?:\\\\.|[^`\\\\])*`|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')' + // 2 string
    '|\\b(\\d+(?:\\.\\d+)?n?)\\b' + // 3 number
    '|\\b(' +
    KEYWORDS +
    ')\\b' + // 4 keyword
    '|([A-Za-z_$][\\w$]*)(?=\\()' + // 5 function call
    '|(?<!\\.)\\.([A-Za-z_$][\\w$]*)(?!\\s*\\()' + // 6 property
    '|(?<=<\\/?)([A-Za-z][\\w.]*)(?=[\\s/>])', // 7 JSX tag name
  'gm',
);

/** Splits JavaScript into colored tokens. Joining every token's text gives back the input. */
export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (kind === 'plain' && last?.kind === 'plain') last.text += text;
    else tokens.push({ kind, text });
  };
  let last = 0;
  PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATTERN.exec(code))) {
    if (m[0] === '') {
      PATTERN.lastIndex++;
      continue;
    }
    push('plain', code.slice(last, m.index));
    if (m[1]) push('cm', m[1]);
    else if (m[2]) push('str', m[2]);
    else if (m[3]) push('num', m[3]);
    else if (m[4]) push('kw', m[4]);
    else if (m[5]) push('fn', m[5]);
    else if (m[6]) {
      push('plain', '.');
      push('prop', m[6]);
    } else if (m[7]) push('tag', m[7]);
    last = PATTERN.lastIndex;
  }
  push('plain', code.slice(last));
  return tokens;
}

export const TOKEN_CLASS: Record<TokenKind, string> = {
  kw: 'text-syn-kw',
  str: 'text-syn-str',
  num: 'text-syn-num',
  fn: 'text-syn-fn',
  prop: 'text-syn-prop',
  tag: 'text-syn-tag',
  cm: 'text-syn-cm italic',
  plain: '',
};

export type ValueKind = 'num' | 'str' | 'bool' | 'nil' | 'plain';

/** Colors console values like devtools: numbers, quoted strings, booleans, null/undefined. */
export function tokenizeValue(text: string): { kind: ValueKind; text: string }[] {
  if (/^-?\d+(\.\d+)?$/.test(text)) return [{ kind: 'num', text }];
  if (text === 'true' || text === 'false') return [{ kind: 'bool', text }];
  if (text === 'undefined' || text === 'null') return [{ kind: 'nil', text }];
  const parts: { kind: ValueKind; text: string }[] = [];
  const rx =
    /('(?:\\.|[^'\\])*')|((?<=[[{(,:] |^)-?\d+(?:\.\d+)?(?=[ ,\]})]|$))|\b(true|false)\b|\b(undefined|null)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) {
    if (m.index > last) parts.push({ kind: 'plain', text: text.slice(last, m.index) });
    parts.push({ kind: m[1] ? 'str' : m[2] ? 'num' : m[3] ? 'bool' : 'nil', text: m[0] });
    last = rx.lastIndex;
  }
  if (last < text.length) parts.push({ kind: 'plain', text: text.slice(last) });
  return parts;
}

export const VALUE_CLASS: Record<ValueKind, string> = {
  num: 'text-syn-num',
  str: 'text-syn-str',
  bool: 'text-syn-kw',
  nil: 'text-syn-cm',
  plain: '',
};
