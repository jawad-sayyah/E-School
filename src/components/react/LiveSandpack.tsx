import { useCallback, useEffect, useRef, useState } from 'react';
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
import { reactTemplate, TEST_PRELUDE, VITEST_SHIM } from './sandboxFiles';
import { PanelBoundary } from './PanelBoundary';
import { sandpackTheme } from './theme';

/*
 * Everything that imports Sandpack lives in this file, so the Sandpack bundle (and its
 * iframes) only load on lessons that actually use a React playground or exercise.
 */

export type SandboxTemplate = 'react' | 'react-ts' | 'vanilla';

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
  const sandbox = template === 'react' ? reactTemplate(files) : template;
  // Read once: a new setup object would make Sandpack restart the bundler.
  const [setup] = useState(() =>
    sandbox === 'vanilla' ? undefined : { dependencies: dependenciesFor(files) },
  );
  return (
    <SandpackProvider
      template={sandbox}
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

/** Reports the code of the given files whenever the student edits them. */
function TrackFiles({
  paths,
  onChange,
}: {
  paths: string[];
  onChange: (files: Record<string, string>) => void;
}) {
  const { sandpack } = useSandpack();
  useEffect(() => {
    onChange(Object.fromEntries(paths.map((p) => [p, sandpack.files[p]?.code ?? ''])));
  }, [sandpack.files, paths, onChange]);
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
  const [initial, setInitial] = useState(() => toSandpackFiles(files, hiddenFiles));
  // If Sandpack's test panel crashes, the sandbox is rebuilt (a new key) from the latest code.
  const [instance, setInstance] = useState(0);
  const [paths] = useState(() => Object.keys(files));
  const latestFiles = useRef(files);
  const rememberFiles = useCallback((code: Record<string, string>) => {
    latestFiles.current = code;
  }, []);
  const rebuild = () => {
    setInitial(toSandpackFiles(latestFiles.current, hiddenFiles));
    setInstance((n) => n + 1);
  };
  const [setup] = useState(() => ({
    dependencies: dependenciesFor({ ...files, ...hiddenFiles, ...dependencyFiles }),
  }));
  const [template] = useState(() => reactTemplate({ ...files, ...dependencyFiles }));
  return (
    <SandpackProvider
      key={instance}
      template={template}
      theme={sandpackTheme}
      files={initial}
      customSetup={setup}
      options={{ activeFile, recompileMode: 'delayed', recompileDelay: 500 }}
    >
      <SyncFiles files={files} version={version} />
      <TrackFiles paths={paths} onChange={rememberFiles} />
      <SandpackLayout>
        <SandpackCodeEditor showLineNumbers showTabs style={{ height }} />
        <SandpackPreview style={{ height }} showOpenInCodeSandbox={false} showRefreshButton />
      </SandpackLayout>
      <PanelBoundary onCrash={rebuild}>
        <SandpackTests
          style={{ height: 230 }}
          verbose
          showWatchButton={false}
          onComplete={(specs) => {
            const summary = summarizeSpecs(specs as unknown as Record<string, SpecResult>);
            // Sandpack calls this while rendering its panel: report after that render.
            setTimeout(() => onResult(summary), 0);
          }}
        />
      </PanelBoundary>
    </SandpackProvider>
  );
}

/** A read-only preview of finished code (the target for "Build the UI"). */
export function LiveTarget({ files, height = 260 }: LiveProps) {
  const [setup] = useState(() => ({ dependencies: dependenciesFor(files) }));
  return (
    <SandpackProvider
      template={reactTemplate(files)}
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
