import { loader, type Monaco } from '@monaco-editor/react';
import {
  TS_COMPILER_OPTIONS,
  cleanEmit,
  flattenMessage,
  locate,
  modelUri,
  withTypeChecks,
  type TsDiagnostic,
} from './options';

/*
 * Monaco is loaded lazily from the jsDelivr CDN (pinned version), only on lessons that use
 * TypeScript. Its built-in TypeScript worker gives the red squiggles, the problems list and
 * the JavaScript that the Run button executes in the sandboxed worker.
 */
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' } });

/* eslint-disable @typescript-eslint/no-explicit-any -- Monaco's TS API moved between versions */
type TsApi = any;

/** `monaco.typescript` in new Monaco versions, `monaco.languages.typescript` in older ones. */
export function tsApi(monaco: Monaco): TsApi {
  return (monaco as any).typescript ?? (monaco.languages as any).typescript;
}

const configured = new WeakSet<object>();

/** Sets the lesson compiler options and the editor theme (once per Monaco instance). */
export function configureMonaco(monaco: Monaco): Monaco {
  if (configured.has(monaco)) return monaco;
  configured.add(monaco);
  const ts = tsApi(monaco);
  // Monaco's own default libs already include the DOM; its lib names differ from tsc's.
  const { lib: _lib, ...options } = TS_COMPILER_OPTIONS;
  void _lib;
  ts.typescriptDefaults.setCompilerOptions(options);
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  ts.typescriptDefaults.setEagerModelSync(true);
  monaco.editor.defineTheme('eschool', THEME);
  return monaco;
}

let ready: Promise<Monaco> | null = null;

export function getMonaco(): Promise<Monaco> {
  ready ??= loader.init().then(configureMonaco);
  return ready;
}

/** Editor colors that match the rest of the site's code editors. */
const THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'C792EA' },
    { token: 'string', foreground: 'C3E88D' },
    { token: 'number', foreground: 'F78C6C' },
    { token: 'comment', foreground: '697098', fontStyle: 'italic' },
    { token: 'type', foreground: 'FFCB6B' },
    { token: 'type.identifier', foreground: 'FFCB6B' },
    { token: 'identifier', foreground: 'D6DEEB' },
  ],
  colors: {
    'editor.background': '#1A1D2E',
    'editor.lineHighlightBackground': '#22263A',
    'editorLineNumber.foreground': '#4B5274',
    'editorLineNumber.activeForeground': '#A6ACCD',
    'editorGutter.background': '#1A1D2E',
  },
};

let reactTypes: Promise<void> | null = null;

/** Adds React's type declarations (only for TSX lessons). */
export function ensureReactTypes(monaco: Monaco): Promise<void> {
  reactTypes ??= import('./reactTypes').then(({ REACT_TYPE_FILES }) => {
    const ts = tsApi(monaco);
    for (const [path, content] of Object.entries(REACT_TYPE_FILES)) {
      ts.typescriptDefaults.addExtraLib(content, `file:///node_modules/${path}`);
    }
  });
  return reactTypes;
}

export interface MonacoCheck {
  diagnostics: TsDiagnostic[];
  /** The code compiled to JavaScript, ready for the worker. */
  js: string;
}

let checkCounter = 0;

/**
 * Type-checks code (plus hidden type-level checks) in a throwaway model and compiles the
 * code itself to JavaScript.
 */
export async function checkWithMonaco(
  monaco: Monaco,
  code: string,
  { checks = '', tsx = false }: { checks?: string; tsx?: boolean } = {},
): Promise<MonacoCheck> {
  if (tsx) await ensureReactTypes(monaco);
  const id = `check-${++checkCounter}`;
  const { text, firstCheckLine } = withTypeChecks(code, checks);
  const checkModel = monaco.editor.createModel(
    text,
    'typescript',
    monaco.Uri.parse(modelUri(id, tsx)),
  );
  const codeModel = monaco.editor.createModel(
    code,
    'typescript',
    monaco.Uri.parse(modelUri(`${id}-code`, tsx)),
  );
  try {
    const getWorker = await tsApi(monaco).getTypeScriptWorker();
    const worker = await getWorker(checkModel.uri, codeModel.uri);
    const uri = checkModel.uri.toString();
    const raw = [
      ...(await worker.getSyntacticDiagnostics(uri)),
      ...(await worker.getSemanticDiagnostics(uri)),
    ] as { start?: number; messageText: string; code: number }[];
    const diagnostics = raw.map((d): TsDiagnostic => {
      const pos = checkModel.getPositionAt(d.start ?? 0);
      return {
        ...locate(pos.lineNumber, firstCheckLine),
        column: pos.column,
        message: flattenMessage(d.messageText as never),
        code: d.code,
      };
    });
    const emit = await worker.getEmitOutput(codeModel.uri.toString());
    const js = cleanEmit(
      emit.outputFiles.find((f: { name: string }) => f.name.endsWith('.js'))?.text ?? '',
    );
    return { diagnostics, js };
  } finally {
    checkModel.dispose();
    codeModel.dispose();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
