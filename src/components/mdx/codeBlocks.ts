import { Children, isValidElement, type ReactNode } from 'react';

export interface CodeBlockData {
  lang: string;
  meta: string;
  code: string;
}

function asCodeBlock(node: ReactNode): CodeBlockData | null {
  if (!isValidElement(node)) return null;
  const props = node.props as Partial<CodeBlockData>;
  if (typeof props.code !== 'string') return null;
  return { lang: props.lang ?? '', meta: props.meta ?? '', code: props.code };
}

/** The fenced code blocks among a component's MDX children, in order. */
export function getCodeBlocks(children: ReactNode): CodeBlockData[] {
  return Children.toArray(children)
    .map(asCodeBlock)
    .filter((b): b is CodeBlockData => b !== null);
}

/** Everything that is not a fenced code block (the prose). */
export function getProse(children: ReactNode): ReactNode[] {
  return Children.toArray(children).filter((child) => asCodeBlock(child) === null);
}

/** Finds the block whose meta contains a word, e.g. "starter" in ```js starter. */
export function findBlock(blocks: CodeBlockData[], word: string): CodeBlockData | undefined {
  return blocks.find((b) => b.meta.split(/\s+/).includes(word));
}

/** Reads `file=cart.js` from a fence's meta. */
export function metaFile(meta: string): string | undefined {
  return /(?:^|\s)file=(\S+)/.exec(meta)?.[1];
}
