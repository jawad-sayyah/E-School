import { useLayoutEffect, useRef } from 'react';
import type { ConsoleLevel } from '@/runner';
import { cn } from '@/lib/utils';
import { VALUE_CLASS, tokenizeValue } from './highlight';

export type DisplayLevel = ConsoleLevel | 'muted';

export interface DisplayLine {
  level: DisplayLevel;
  text: string;
}

interface ConsoleViewProps {
  lines: DisplayLine[];
  state: string;
  title?: string;
}

const LINE_CLASS: Record<DisplayLevel, string> = {
  log: 'text-con-text',
  info: 'text-con-text',
  warn: 'text-js',
  error: 'bg-danger/5 text-[#FF8A80]',
  muted: 'italic text-ed-gutter',
};

const MARK: Record<DisplayLevel, string> = {
  log: '›',
  info: '›',
  warn: '⚠',
  error: '✕',
  muted: '',
};

/** Devtools-style console. Max height ~320px and it follows new output. */
export function ConsoleView({ lines, state, title = 'Console' }: ConsoleViewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [lines]);

  return (
    <div className="border-t border-ed-line bg-con-bg">
      <div className="flex h-8 items-center gap-2 border-b border-ed-bg px-3.5 text-[11px] font-semibold tracking-[0.06em] text-ed-gutter uppercase">
        {title}
        <span className="ml-auto font-medium tracking-normal normal-case" aria-live="polite">
          {state}
        </span>
      </div>
      <div
        ref={bodyRef}
        role="log"
        aria-label={`${title} output`}
        tabIndex={0}
        className="max-h-80 min-h-[42px] overflow-y-auto overscroll-contain py-2.5 font-mono text-[13.5px] leading-[21px]"
      >
        {lines.map((line, i) => (
          <div key={i} className={cn('flex gap-2.5 px-3.5 py-px', LINE_CLASS[line.level])}>
            {MARK[line.level] && (
              <span aria-hidden="true" className="shrink-0 text-ed-gutter">
                {MARK[line.level]}
              </span>
            )}
            <span className="break-words whitespace-pre-wrap">
              {line.level === 'log' || line.level === 'info'
                ? tokenizeValue(line.text).map((p, j) => (
                    <span key={j} className={VALUE_CLASS[p.kind]}>
                      {p.text}
                    </span>
                  ))
                : line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Turns a lesson's expected output into console lines.
 * "Uncaught …" lines are errors, "~ …" lines are muted notes.
 */
export function expectedLines(expected: string[] | string | undefined): DisplayLine[] {
  const list = typeof expected === 'string' ? expected.split('\n') : (expected ?? []);
  return list.map((text) =>
    text.startsWith('Uncaught ')
      ? { level: 'error', text }
      : text.startsWith('~ ')
        ? { level: 'muted', text: text.slice(2) }
        : { level: 'log', text },
  );
}
