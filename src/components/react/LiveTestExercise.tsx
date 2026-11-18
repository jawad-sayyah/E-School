import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackProvider,
  SandpackTests,
  useSandpack,
  type SandpackFiles,
} from '@codesandbox/sandpack-react';
import { reactTemplate, TEST_PRELUDE, VITEST_SHIM } from './sandboxFiles';
import { dependenciesFor } from './packages';
import {
  bugPath,
  checkFile,
  retarget,
  summarizeByFile,
  type SpecResult,
  type SpecSummary,
} from './specs';
import { PanelBoundary } from './PanelBoundary';
import { sandpackTheme } from './theme';

/*
 * "Write the tests" for React, in Sandpack. The student edits one test file. For every
 * buggy version of the code, a hidden copy of their tests imports that version instead
 * (/check-N.test.js → /__bugs__/bug-N/…), so one test run grades every version.
 */

export interface LiveTestResult {
  /** The student's tests on the correct code. */
  correct: SpecSummary | null;
  /** Per bug: did at least one of the student's tests fail on that version? */
  caught: (boolean | null)[];
}

interface LiveTestExerciseProps {
  /** The correct code under test (read-only in the editor). */
  codeFiles: Record<string, string>;
  /** Each bug replaces some of the code files. */
  bugs: Record<string, string>[];
  testFile: string;
  /** The tests to start from (or to load, when `version` changes). */
  tests: string;
  version: number;
  height?: number;
  onResult: (result: LiveTestResult) => void;
}

function checkFiles(tests: string, codeFiles: string[], bugCount: number, testFile: string) {
  const out: Record<string, string> = {};
  for (let i = 0; i < bugCount; i++)
    out[checkFile(i, testFile)] = TEST_PRELUDE + retarget(tests, codeFiles, i);
  return out;
}

/** Keeps the hidden copies in step with the student's test file, and loads new tests on demand. */
function SyncTests({
  testFile,
  codeFiles,
  bugCount,
  tests,
  version,
  onTestsChange,
}: {
  testFile: string;
  codeFiles: string[];
  bugCount: number;
  tests: string;
  version: number;
  /** Reports the student's latest tests (kept if the sandbox has to be rebuilt). */
  onTestsChange: (code: string) => void;
}) {
  const { sandpack } = useSandpack();
  const current = sandpack.files[testFile]?.code ?? '';
  const applied = useRef(version);
  useEffect(() => onTestsChange(current), [current, onTestsChange]);
  useEffect(() => {
    if (applied.current === version) return;
    applied.current = version;
    sandpack.updateFile({ [testFile]: tests, ...checkFiles(tests, codeFiles, bugCount, testFile) });
  }, [version, tests, testFile, codeFiles, bugCount, sandpack]);

  useEffect(() => {
    if (applied.current !== version) return;
    const sync = setTimeout(() => {
      // Only files that really changed: each update recompiles and starts a test run, and a
      // run that starts while another is still reporting makes Sandpack's panel crash.
      const changed = Object.fromEntries(
        Object.entries(checkFiles(current, codeFiles, bugCount, testFile)).filter(
          ([path, code]) => sandpack.files[path]?.code !== code,
        ),
      );
      if (Object.keys(changed).length > 0) sandpack.updateFile(changed);
    }, 600);
    return () => clearTimeout(sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when the tests change
  }, [current]);

  return null;
}

export function LiveTestExercise({
  codeFiles,
  bugs,
  testFile,
  tests,
  version,
  height = 360,
  onResult,
}: LiveTestExerciseProps) {
  const codePaths = Object.keys(codeFiles);
  const [setup] = useState(() => ({
    dependencies: dependenciesFor({ ...codeFiles, [testFile]: tests }),
  }));
  const buildFiles = (studentTests: string): SandpackFiles => {
    const out: SandpackFiles = { ...VITEST_SHIM };
    for (const [path, code] of Object.entries(codeFiles)) out[path] = { code, readOnly: true };
    out[testFile] = { code: studentTests, active: true };
    bugs.forEach((bug, i) => {
      for (const path of codePaths) {
        out[bugPath(i, path)] = { code: bug[path] ?? codeFiles[path], hidden: true };
      }
    });
    for (const [path, code] of Object.entries(
      checkFiles(studentTests, codePaths, bugs.length, testFile),
    )) {
      out[path] = { code, hidden: true };
    }
    return out;
  };
  const [files, setFiles] = useState<SandpackFiles>(() => buildFiles(tests));
  // If Sandpack's test panel crashes, the sandbox is rebuilt (a new key) from the latest tests.
  const [instance, setInstance] = useState(0);
  const latestTests = useRef(tests);
  const rememberTests = useCallback((code: string) => {
    latestTests.current = code;
  }, []);
  const rebuild = () => {
    latest.current = {};
    setFiles(buildFiles(latestTests.current));
    setInstance((n) => n + 1);
  };
  const [template] = useState(() => reactTemplate(codeFiles));
  const latest = useRef<Record<string, SpecSummary>>({});
  const panel = useRef<HTMLDivElement>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pending.current), []);

  /** Presses the test panel's own "Run tests" button once it's idle (it hides while running). */
  const runAll = useCallback(() => {
    clearTimeout(pending.current);
    let tries = 0;
    const attempt = () => {
      // The panel's run button (its icon's <title> is "Run sandbox"); hidden while running.
      const button = [...(panel.current?.querySelectorAll('button') ?? [])].find(
        (b) => b.textContent?.trim() === 'Run sandbox',
      );
      if (button) button.click();
      else if (++tries < 120) pending.current = setTimeout(attempt, 250); // up to 30 s
    };
    pending.current = setTimeout(attempt, 150);
  }, []);

  return (
    <SandpackProvider
      key={instance}
      template={template}
      theme={sandpackTheme}
      files={files}
      customSetup={setup}
      options={{ activeFile: testFile, visibleFiles: [testFile, ...codePaths] }}
    >
      <SyncTests
        testFile={testFile}
        codeFiles={codePaths}
        bugCount={bugs.length}
        tests={tests}
        version={version}
        onTestsChange={rememberTests}
      />
      <SandpackLayout>
        <SandpackCodeEditor showLineNumbers showTabs style={{ height }} />
      </SandpackLayout>
      <div ref={panel}>
        <PanelBoundary onCrash={rebuild}>
          <SandpackTests
            style={{ height: 260 }}
            verbose
            showWatchButton={false}
            onComplete={(specs) => {
              // Watch mode re-runs only the edited suite. After a partial run, run them all,
              // so the hidden copies are always graded against the latest tests.
              if (Object.keys(specs).length < 1 + bugs.length) runAll();
              latest.current = {
                ...latest.current,
                ...summarizeByFile(specs as unknown as Record<string, SpecResult>),
              };
              const byFile = latest.current;
              const result = {
                correct: byFile[testFile] ?? null,
                caught: bugs.map((_, i) => {
                  const s = byFile[checkFile(i, testFile)];
                  return s ? s.failed > 0 || s.broken !== null : null;
                }),
              };
              // Sandpack calls this while rendering its panel: report after that render.
              setTimeout(() => onResult(result), 0);
            }}
          />
        </PanelBoundary>
      </div>
    </SandpackProvider>
  );
}
