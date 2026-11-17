import { lazy, Suspense, type ReactNode } from 'react';
import { AtomIcon } from 'lucide-react';
import { CodeView } from '@/components/questions/CodeView';
import { fileName } from '@/components/react/specs';
import { getCodeBlocks } from './codeBlocks';

const LivePlayground = lazy(() =>
  import('@/components/react/LiveSandpack').then((m) => ({ default: m.LivePlayground })),
);

interface ReactPlaygroundProps {
  /** 'react' (default) or 'vanilla' for plain HTML + JavaScript. */
  template?: 'react' | 'vanilla';
  /** Height of the editor and preview, in pixels. */
  height?: number;
  /** Show the browser console under the preview. */
  console?: boolean;
  /** Fenced blocks, one per file: ```jsx file=/App.js, ```css file=/styles.css … */
  children?: ReactNode;
}

/** The code, shown statically while Sandpack loads (or if it can't load at all). */
export function SandpackFallback({ files, note }: { files: Record<string, string>; note: string }) {
  const [first, ...rest] = Object.entries(files);
  return (
    <div aria-busy="true">
      {first && <CodeView code={first[1]} file={first[0].slice(1)} lang="jsx" />}
      {rest.length > 0 && (
        <p className="text-xs text-faint">+ {rest.map(([path]) => path.slice(1)).join(', ')}</p>
      )}
      <p className="flex items-center gap-2 text-xs text-faint">
        <AtomIcon aria-hidden className="size-3.5 animate-spin [animation-duration:3s]" />
        {note}
      </p>
    </div>
  );
}

/** A live React example: edit the code, see the preview update. */
export function ReactPlayground({
  template = 'react',
  height = 340,
  console: showConsole = false,
  children,
}: ReactPlaygroundProps) {
  const blocks = getCodeBlocks(children);
  const fallbackFile = template === 'vanilla' ? '/index.js' : '/App.js';
  const files = Object.fromEntries(blocks.map((b) => [fileName(b, fallbackFile), b.code]));
  const activeFile = blocks[0] ? fileName(blocks[0], fallbackFile) : fallbackFile;
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-ed-line">
      <Suspense fallback={<SandpackFallback files={files} note="Loading the live editor…" />}>
        <LivePlayground
          template={template}
          files={files}
          activeFile={activeFile}
          height={height}
          showConsole={showConsole}
        />
      </Suspense>
    </div>
  );
}
