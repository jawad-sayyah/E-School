import type { ReactNode } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { CodeEditor } from '@/editor/CodeEditor';
import { EditorFrame } from '@/editor/EditorFrame';
import { cn } from '@/lib/utils';
import { getCodeBlocks } from './codeBlocks';

interface CompareProps {
  /** One-line result of the wrong code, e.g. "Prints 51". */
  wrong: string;
  /** One-line result of the right code. */
  right: string;
  wrongFile?: string;
  rightFile?: string;
  /** Two fenced code blocks: the wrong one first, then the right one. */
  children?: ReactNode;
}

function Side({
  kind,
  code,
  lang,
  file,
  caption,
}: {
  kind: 'wrong' | 'right';
  code: string;
  lang: string;
  file: string;
  caption: string;
}) {
  const isWrong = kind === 'wrong';
  return (
    <figure className="m-0 min-w-0">
      <div
        className={cn(
          'mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase',
          isWrong ? 'text-warn-badge' : 'text-success',
        )}
      >
        {isWrong ? (
          <XIcon aria-hidden className="size-3.5" />
        ) : (
          <CheckIcon aria-hidden className="size-3.5" />
        )}
        {isWrong ? 'Wrong' : 'Right'}
      </div>
      <EditorFrame
        file={file}
        lang={lang}
        className={cn('my-0', isWrong ? 'border-danger/60' : 'border-success/60')}
      >
        <CodeEditor
          value={code}
          onChange={() => undefined}
          label={`${isWrong ? 'Wrong' : 'Right'} code`}
          readOnly
        />
      </EditorFrame>
      <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** Side-by-side "Wrong" vs "Right" code, each with a one-line result. */
export function Compare({
  wrong,
  right,
  wrongFile = 'wrong.js',
  rightFile = 'right.js',
  children,
}: CompareProps) {
  const [bad, good] = getCodeBlocks(children);
  return (
    <div className="my-6 grid gap-4 md:grid-cols-2">
      <Side
        kind="wrong"
        code={bad?.code ?? ''}
        lang={bad?.lang || 'js'}
        file={wrongFile}
        caption={wrong}
      />
      <Side
        kind="right"
        code={good?.code ?? ''}
        lang={good?.lang || 'js'}
        file={rightFile}
        caption={right}
      />
    </div>
  );
}
