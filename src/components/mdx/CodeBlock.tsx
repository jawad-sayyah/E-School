import { CodeEditor } from '@/editor/CodeEditor';
import { CopyButton } from '@/editor/CopyButton';
import { EditorFrame } from '@/editor/EditorFrame';
import { metaFile } from './codeBlocks';

interface CodeBlockProps {
  lang?: string;
  meta?: string;
  code: string;
}

const DEFAULT_FILE: Record<string, string> = {
  js: 'example.js',
  jsx: 'App.jsx',
  ts: 'example.ts',
  tsx: 'App.tsx',
  html: 'index.html',
  css: 'styles.css',
  json: 'data.json',
  bash: 'terminal',
};

/**
 * A plain fenced code block in a lesson: read-only, highlighted, with Copy.
 * Components like <Playground> read these blocks' props instead of rendering them.
 */
export function CodeBlock({ lang = '', meta = '', code }: CodeBlockProps) {
  const file = metaFile(meta) ?? DEFAULT_FILE[lang] ?? 'snippet';
  return (
    <EditorFrame file={file} lang={lang} actions={<CopyButton text={code} />}>
      <CodeEditor value={code} onChange={() => undefined} label={`Code: ${file}`} readOnly />
    </EditorFrame>
  );
}
