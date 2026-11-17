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
import { dependenciesFor } from './packages';
import { sandpackTheme } from './theme';

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

/**
 * Sandpack's test runner renders into jsdom but exposes the browser's own FormData, which
 * rejects jsdom forms, so React 19 form actions would fail. Hidden test files get this line
 * first, making the global FormData jsdom's. (Harmless where they're already the same.)
 */
export const TEST_PRELUDE =
  'if (typeof document !== "undefined" && document.defaultView && document.defaultView.FormData !== FormData) globalThis.FormData = document.defaultView.FormData;\n';

/**
 * Sandpack's test runner is Jest-based. This hidden local package lets test files be written
 * the Vitest way (`import { vi, test, expect } from "vitest"`): it re-exports Jest's globals,
 * and `vi` is Jest's `jest` object (fn, spyOn, useFakeTimers, advanceTimersByTime…).
 * In the generated Vitest tests, "vitest" is the real thing.
 */
export const VITEST_SHIM: SandpackFiles = {
  '/node_modules/vitest/package.json': {
    code: JSON.stringify({ name: 'vitest', version: '0.0.0-sandpack', main: 'index.js' }),
    hidden: true,
  },
  '/node_modules/vitest/index.js': {
    code: [
      'const g = globalThis;',
      'export const vi = g.jest;',
      'export const test = g.test;',
      'export const it = g.it;',
      'export const describe = g.describe;',
      'export const expect = g.expect;',
      'export const beforeEach = g.beforeEach;',
      'export const afterEach = g.afterEach;',
      'export const beforeAll = g.beforeAll;',
      'export const afterAll = g.afterAll;',
      '',
    ].join('\n'),
    hidden: true,
  },
};

function toSandpackFiles(
  files: Record<string, string>,
  hidden: Record<string, string> = {},
): SandpackFiles {
  const out: SandpackFiles = { ...VITEST_SHIM };
  for (const [path, code] of Object.entries(files)) out[path] = { code };
  for (const [path, code] of Object.entries(hidden)) {
    const prelude = /\.test\.[jt]sx?$/.test(path) ? TEST_PRELUDE : '';
    out[path] = { code: prelude + code, hidden: true };
  }
  return out;
}

/** Editor + live preview (+ optional console). */
export function LivePlayground({
  template = 'react',
  files,
  activeFile,
  height = 340,
  showConsole = false,
}: LiveProps & { showConsole?: boolean }) {
  // Read once: a new setup object would make Sandpack restart the bundler.
  const [setup] = useState(() =>
    template === 'react' ? { dependencies: dependenciesFor(files) } : undefined,
  );
  return (
    <SandpackProvider
      template={template}
      theme={sandpackTheme}
      files={toSandpackFiles(files)}
      customSetup={setup}
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
  dependencyFiles,
}: LiveProps & {
  version?: number;
  /** All the code the exercise may use (starter, solution, tests), to work out its npm packages. */
  dependencyFiles?: Record<string, string>;
  onResult: (summary: SpecSummary) => void;
}) {
  // The provider only reads its files and setup once; later changes go through SyncFiles.
  const [initial] = useState(() => toSandpackFiles(files, hiddenFiles));
  const [setup] = useState(() => ({
    dependencies: dependenciesFor({ ...files, ...hiddenFiles, ...dependencyFiles }),
  }));
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
  const [setup] = useState(() => ({ dependencies: dependenciesFor(files) }));
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
