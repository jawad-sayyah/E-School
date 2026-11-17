import { useEffect, useRef, useState } from 'react';
import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  SandpackTests,
  useSandpack,
  type SandpackFiles,
} from '@codesandbox/sandpack-react';
import { summarizeSpecs, type SpecResult, type SpecSummary } from './specs';
import { SANDBOX_DEPENDENCIES, sandpackTheme } from './theme';

/*
 * Everything that imports Sandpack lives in this file, so the Sandpack bundle (and its
 * iframes) only load on lessons that actually use a React playground or exercise.
 */

export type SandboxTemplate = 'react' | 'vanilla';

interface LiveProps {
  /** 'react' (default) or 'vanilla': a plain HTML page with /index.html and /index.js. */
  template?: SandboxTemplate;
  files: Record<string, string>;
  /** Files the student can't see, e.g. hidden tests. */
  hiddenFiles?: Record<string, string>;
  activeFile?: string;
  height?: number;
}

function toSandpackFiles(
  files: Record<string, string>,
  hidden: Record<string, string> = {},
): SandpackFiles {
  const out: SandpackFiles = {};
  for (const [path, code] of Object.entries(files)) out[path] = { code };
  for (const [path, code] of Object.entries(hidden)) out[path] = { code, hidden: true };
  return out;
}

const setup = { dependencies: SANDBOX_DEPENDENCIES };

/** Editor + live preview (+ optional console). */
export function LivePlayground({
  template = 'react',
  files,
  activeFile,
  height = 340,
  showConsole = false,
}: LiveProps & { showConsole?: boolean }) {
  return (
    <SandpackProvider
      template={template}
      theme={sandpackTheme}
      files={toSandpackFiles(files)}
      customSetup={template === 'react' ? setup : undefined}
      options={{ activeFile, recompileMode: 'delayed', recompileDelay: 400 }}
    >
      <SandpackLayout>
        <SandpackCodeEditor showLineNumbers showTabs style={{ height }} />
        <SandpackPreview style={{ height }} showOpenInCodeSandbox={false} showRefreshButton />
      </SandpackLayout>
      {showConsole && <SandpackConsole style={{ height: 140 }} />}
    </SandpackProvider>
  );
}

/**
 * Replaces the editor's files when `version` changes (Reset code, Put the solution in the
 * editor). Updating the running sandbox, instead of remounting it, keeps the bundler warm,
 * and the tests re-run because they watch for file changes.
 */
function SyncFiles({ files, version }: { files: Record<string, string>; version: number }) {
  const { sandpack } = useSandpack();
  const applied = useRef(version);
  useEffect(() => {
    if (applied.current === version) return;
    applied.current = version;
    sandpack.updateFile(files);
  }, [version, files, sandpack]);
  return null;
}

/** Editor + preview + the hidden tests, with results reported back. */
export function LiveExercise({
  files,
  hiddenFiles,
  activeFile,
  height = 340,
  version = 0,
  onResult,
}: LiveProps & { version?: number; onResult: (summary: SpecSummary) => void }) {
  // The provider only reads its files once; later changes go through SyncFiles.
  const [initial] = useState(() => toSandpackFiles(files, hiddenFiles));
  return (
    <SandpackProvider
      template="react"
      theme={sandpackTheme}
      files={initial}
      customSetup={setup}
      options={{ activeFile, recompileMode: 'delayed', recompileDelay: 500 }}
    >
      <SyncFiles files={files} version={version} />
      <SandpackLayout>
        <SandpackCodeEditor showLineNumbers showTabs style={{ height }} />
        <SandpackPreview style={{ height }} showOpenInCodeSandbox={false} showRefreshButton />
      </SandpackLayout>
      <SandpackTests
        style={{ height: 230 }}
        verbose
        showWatchButton={false}
        onComplete={(specs) =>
          onResult(summarizeSpecs(specs as unknown as Record<string, SpecResult>))
        }
      />
    </SandpackProvider>
  );
}

/** A read-only preview of finished code (the target for "Build the UI"). */
export function LiveTarget({ files, height = 260 }: LiveProps) {
  return (
    <SandpackProvider
      template="react"
      theme={sandpackTheme}
      files={toSandpackFiles(files)}
      customSetup={setup}
    >
      <SandpackLayout>
        <SandpackPreview
          style={{ height }}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}
