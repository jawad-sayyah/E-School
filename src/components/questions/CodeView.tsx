import type { ReactNode } from 'react';
import { CodeEditor } from '@/editor/CodeEditor';
import { EditorFrame } from '@/editor/EditorFrame';

/** Read-only code in the editor frame (used inside questions). */
export function CodeView({
  code,
  file = 'question.js',
  lang = 'js',
  actions,
  children,
}: {
  code: string;
  file?: string;
  lang?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <EditorFrame file={file} lang={lang} actions={actions} className="my-3">
      <CodeEditor value={code} onChange={() => undefined} label={`Code: ${file}`} readOnly />
      {children}
    </EditorFrame>
  );
}
