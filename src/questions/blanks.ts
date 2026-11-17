/**
 * Fill-in-the-blanks code: blanks are written as __[answer]__ or __[answer|alternative]__.
 * (Chosen because it never appears in real JavaScript, unlike [[ ]] or {{ }}.)
 */

export interface BlankSegment {
  blank: number;
  answers: string[];
}

export type Segment = string | BlankSegment;

const BLANK = /__\[(.+?)\]__/g;

export function parseBlanks(code: string): { segments: Segment[]; answers: string[][] } {
  const segments: Segment[] = [];
  const answers: string[][] = [];
  let last = 0;
  for (const match of code.matchAll(BLANK)) {
    const index = match.index ?? 0;
    if (index > last) segments.push(code.slice(last, index));
    const alts = match[1].split('|').map((a) => a.trim());
    segments.push({ blank: answers.length, answers: alts });
    answers.push(alts);
    last = index + match[0].length;
  }
  if (last < code.length) segments.push(code.slice(last));
  return { segments, answers };
}

/** The code with every blank filled with its first answer (used to run and test it). */
export function fillBlanks(code: string, values?: string[]): string {
  let i = 0;
  return code.replace(BLANK, (_, inner: string) => {
    const value = values?.[i] ?? inner.split('|')[0].trim();
    i++;
    return value;
  });
}
