import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from 'lucide-react';
import { TOKEN_CLASS, VALUE_CLASS, tokenize, tokenizeValue } from '@/editor/highlight';
import { TextWithCode } from '@/components/InlineCode';
import { cn } from '@/lib/utils';

/** A console-style value with number/string/boolean colors. */
export function Value({ text }: { text: string }) {
  return (
    <>
      {tokenizeValue(text).map((p, i) => (
        <span key={i} className={VALUE_CLASS[p.kind]}>
          {p.text}
        </span>
      ))}
    </>
  );
}

/** The code with line numbers; the current line gets an arrow and a highlight. */
export function CodeLines({ code, current }: { code: string; current?: number }) {
  return (
    <ol className="py-2 font-mono text-[13.5px] leading-[23px]" aria-label="Code">
      {code.split('\n').map((line, i) => {
        const here = current === i + 1;
        return (
          <li
            key={i}
            aria-current={here ? 'step' : undefined}
            className={cn('relative flex transition-colors duration-200', here && 'bg-syn-fn/15')}
          >
            <span className="w-10 shrink-0 pr-2 text-right text-ed-gutter select-none">
              {here ? (
                <ArrowRightIcon aria-hidden className="ml-auto inline size-3.5 text-syn-fn" />
              ) : (
                i + 1
              )}
            </span>
            <code className="flex-1 overflow-x-auto px-3 whitespace-pre text-ed-text">
              {tokenize(line).map((t, j) => (
                <span key={j} className={TOKEN_CLASS[t.kind]}>
                  {t.text}
                </span>
              ))}
              {line === '' && ' '}
            </code>
          </li>
        );
      })}
    </ol>
  );
}

export function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 font-sans text-[10px] font-semibold tracking-[0.08em] text-ed-gutter uppercase">
      {children}
    </p>
  );
}

/** Everything printed so far. */
export function ConsolePanel({ lines }: { lines: string[] }) {
  return (
    <div>
      <PanelLabel>Console</PanelLabel>
      <div className="min-h-7 rounded bg-con-bg px-2 py-1 font-mono text-[13px] text-con-text">
        {lines.length === 0 ? (
          <span className="text-ed-gutter italic">nothing yet</span>
        ) : (
          lines.map((o, i) => (
            <div key={i}>
              <span className="text-ed-gutter">› </span>
              <Value text={o} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** The one-sentence explanation under a visualizer, for the current step. */
export function StepNote({ step, note }: { step: number; note?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {note && (
        <motion.figcaption
          key={step}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="border-t border-ed-line bg-ed-tab px-4 py-2.5 font-sans text-sm text-ed-text"
          aria-live="polite"
        >
          <TextWithCode text={note} />
        </motion.figcaption>
      )}
    </AnimatePresence>
  );
}
