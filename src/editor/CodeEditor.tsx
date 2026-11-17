import { useId, useMemo, useRef, type KeyboardEvent } from 'react';
import { applyEdit, editorKeyAction } from './editorKeys';
import { TOKEN_CLASS, tokenize } from './highlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  label: string;
  readOnly?: boolean;
}

/** Highlighted code with line numbers. Editable unless readOnly. */
export function CodeEditor({ value, onChange, onRun, label, readOnly = false }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  /** After Escape, the next Tab leaves the editor (so keyboard users never get trapped). */
  const tabOutRef = useRef(false);
  const hintId = useId();
  const tokens = useMemo(() => tokenize(value), [value]);
  const lineCount = value.split('\n').length;

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      tabOutRef.current = true;
      return;
    }
    if (event.key === 'Tab' && tabOutRef.current) {
      tabOutRef.current = false;
      return;
    }
    tabOutRef.current = false;
    const ta = event.currentTarget;
    const action = editorKeyAction(
      { value: ta.value, start: ta.selectionStart, end: ta.selectionEnd },
      event,
    );
    if (!action) return;
    event.preventDefault();
    if (action.type === 'run') onRun?.();
    else if (action.type === 'move') ta.setSelectionRange(action.selStart, action.selEnd);
    else applyEdit(ta, action, onChange);
  };

  const code = (
    <code>
      {tokens.map((t, i) =>
        t.kind === 'plain' ? (
          t.text
        ) : (
          <span key={i} className={TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ),
      )}
      {'\n'}
    </code>
  );

  return (
    <div className="flex bg-ed-bg">
      <div
        aria-hidden="true"
        className="code-gutter shrink-0 select-none border-r border-ed-line py-[14px] text-right text-ed-gutter"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="min-w-11 pr-3 pl-2">
            {i + 1}
          </div>
        ))}
      </div>
      {readOnly ? (
        <div className="code-layers overflow-x-auto">
          <pre tabIndex={0} aria-label={label} className="pointer-events-auto! w-max min-w-full">
            {code}
          </pre>
        </div>
      ) : (
        <div className="code-layers">
          <pre ref={preRef} aria-hidden="true">
            {code}
          </pre>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={(e) => {
              const ta = e.currentTarget;
              if (preRef.current) {
                preRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-label={label}
            aria-describedby={hintId}
          />
          <span id={hintId} className="sr-only">
            Ctrl or Command plus Enter runs the code. Press Escape, then Tab, to leave the editor.
          </span>
        </div>
      )}
    </div>
  );
}
