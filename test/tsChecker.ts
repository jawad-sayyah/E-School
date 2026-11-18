import path from 'node:path';
import ts from 'typescript';
import {
  cleanEmit,
  flattenMessage,
  locate,
  withTypeChecks,
  type TsDiagnostic,
} from '../src/ts/options';

/*
 * The content tests' stand-in for Monaco: type-checks lesson code with the real TypeScript
 * compiler and the same settings (src/ts/options.ts), and transpiles it for the JS runner.
 */

const OPTIONS: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  moduleDetection: ts.ModuleDetectionKind.Force,
  jsx: ts.JsxEmit.ReactJSX,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
};

// The virtual lesson file lives inside the project, so `react` resolves from node_modules.
const DIR = path.resolve(__dirname, '../src/content');
const host = ts.createCompilerHost(OPTIONS);
const cache = new Map<string, ts.SourceFile | undefined>();
const baseGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
  if (!cache.has(fileName)) {
    cache.set(fileName, baseGetSourceFile(fileName, languageVersion, onError, shouldCreate));
  }
  return cache.get(fileName);
};

export interface TsCheckResult {
  diagnostics: TsDiagnostic[];
}

/** Type-checks `code` (plus hidden type-level `checks` appended to it). */
export function typeCheck(code: string, checks = '', tsx = false): TsCheckResult {
  const { text, firstCheckLine } = withTypeChecks(code, checks);
  const file = path.join(DIR, `__lesson__.${tsx ? 'tsx' : 'ts'}`).replace(/\\/g, '/');
  const isLesson = (name: string) => name.split(path.sep).join('/') === file;
  const programHost: ts.CompilerHost = {
    ...host,
    // Created with the options the program passes (they mark every file as a module).
    getSourceFile: (name, languageVersionOrOptions, ...rest) =>
      isLesson(name)
        ? ts.createSourceFile(name, text, languageVersionOrOptions, true)
        : host.getSourceFile(name, languageVersionOrOptions, ...rest),
    fileExists: (name) => isLesson(name) || host.fileExists(name),
    readFile: (name) => (isLesson(name) ? text : host.readFile(name)),
  };
  const program = ts.createProgram([file], OPTIONS, programHost);
  const source = program.getSourceFile(file);
  const raw = [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ];
  const diagnostics = raw.map((d): TsDiagnostic => {
    const pos =
      d.file && d.start !== undefined
        ? d.file.getLineAndCharacterOfPosition(d.start)
        : { line: 0, character: 0 };
    return {
      ...locate(pos.line + 1, firstCheckLine),
      column: pos.character + 1,
      message: flattenMessage(d.messageText as never),
      code: d.code,
    };
  });
  return { diagnostics };
}

/** TypeScript → JavaScript the worker can run (types removed, no module wrapper). */
export function transpile(code: string, tsx = false): string {
  const out = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: tsx ? 'lesson.tsx' : 'lesson.ts',
  });
  return cleanEmit(out.outputText);
}

/**
 * Type-checks a whole multi-file project (e.g. one MiniShop step: `/App.tsx`, `/types.ts`…)
 * with the shared options. Files live in a virtual folder inside the project, so imports of
 * `react`, `@tanstack/react-query` or `vitest` resolve from node_modules. Returns
 * "file:line message" strings; empty means it compiles.
 */
export function typeCheckProject(files: Record<string, string>): string[] {
  const root = path.resolve(__dirname, '../src/content/.virtual-project');
  // A real project loads jest-dom's matcher types in its Vitest setup file.
  const setup = { '/vitest-setup.d.ts': 'import "@testing-library/jest-dom/vitest";' };
  const virtual = new Map(
    Object.entries({ ...setup, ...files }).map(([file, code]) => [
      path.normalize(path.join(root, file.replace(/^\//, ''))),
      code,
    ]),
  );
  const projectHost = ts.createCompilerHost(OPTIONS);
  const get = (fileName: string) => virtual.get(path.normalize(fileName));
  projectHost.fileExists = (f) => get(f) !== undefined || ts.sys.fileExists(f);
  projectHost.readFile = (f) => get(f) ?? ts.sys.readFile(f);
  projectHost.directoryExists = (dir) =>
    path.normalize(dir).startsWith(root) || ts.sys.directoryExists(dir);
  projectHost.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const code = get(fileName);
    if (code !== undefined) return ts.createSourceFile(fileName, code, languageVersion, true);
    return host.getSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  // Only TypeScript files are roots (a styles.css is part of the project, not compiled).
  const roots = [...virtual.keys()].filter((f) => /\.tsx?$/.test(f));
  const program = ts.createProgram(roots, OPTIONS, projectHost);
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const where = d.file
      ? `${path.relative(root, d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}`
      : 'project';
    return `${where} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
  });
}
