import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { configureMonaco, ensureReactTypes } from '@/ts/monaco';
import { modelUri } from '@/ts/options';

/*
 * The Monaco editor for TypeScript lessons. This file (and Monaco itself) only loads on
 * pages that use <TSPlayground> or <TSExercise>.
 */

export interface EditorProblem {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface TsEditorProps {
  /** A unique name for this editor's file, e.g. "cart-1". */
  name: string;
  value: string;
  onChange: (value: string) => void;
  tsx?: boolean;
  label: string;
  onRun?: () => void;
  onProblems?: (problems: EditorProblem[]) => void;
  minHeight?: number;
  maxHeight?: number;
}

const LINE_HEIGHT = 23;

export default function TsEditor({
  name,
  value,
  onChange,
  tsx = false,
  label,
  onRun,
  onProblems,
  minHeight = 3 * LINE_HEIGHT,
  maxHeight = 520,
}: TsEditorProps) {
  const [height, setHeight] = useState(() =>
    Math.min(maxHeight, Math.max(minHeight, value.split('\n').length * LINE_HEIGHT + 20)),
  );
  // The latest onRun, so the keyboard shortcut registered once always calls the current one.
  const runRef = useRef(onRun);
  useEffect(() => {
    runRef.current = onRun;
  }, [onRun]);

  const beforeMount = useCallback(
    (monaco: Monaco) => {
      configureMonaco(monaco);
      if (tsx) void ensureReactTypes(monaco);
    },
    [tsx],
  );

  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
    editor.onDidContentSizeChange((e) => {
      if (e.contentHeightChanged) {
        setHeight(Math.min(maxHeight, Math.max(minHeight, e.contentHeight)));
      }
    });
  };

  return (
    <div style={{ height }} className="bg-ed-bg">
      <Editor
        path={modelUri(name, tsx)}
        defaultLanguage="typescript"
        value={value}
        theme="eschool"
        beforeMount={beforeMount}
        onMount={onMount}
        onChange={(v) => onChange(v ?? '')}
        onValidate={(markers) =>
          onProblems?.(
            markers.map((m) => ({
              line: m.startLineNumber,
              column: m.startColumn,
              message: m.message,
              severity: m.severity >= 8 ? 'error' : 'warning',
            })),
          )
        }
        loading={<span className="text-xs text-ed-gutter">Loading the TypeScript editor…</span>}
        options={{
          ariaLabel: `${label}. Press Ctrl+M to make Tab move focus out of the editor.`,
          fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
          fontLigatures: false,
          fontSize: 14,
          lineHeight: LINE_HEIGHT,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 10, bottom: 10 },
          overviewRulerLanes: 0,
          renderLineHighlight: 'line',
          fixedOverflowWidgets: true,
          scrollbar: { alwaysConsumeMouseWheel: false },
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
