import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorProblem } from './TsEditor';

/** The "Problems" panel under a TypeScript editor, like VS Code's. */
export function Problems({
  problems,
  pending = false,
  className,
}: {
  problems: EditorProblem[] | null;
  /** True until Monaco has checked the code at least once. */
  pending?: boolean;
  className?: string;
}) {
  const errors = (problems ?? []).filter((p) => p.severity === 'error');
  return (
    <div className={cn('border-t border-ed-line bg-con-bg', className)}>
      <div className="flex h-8 items-center gap-2 border-b border-ed-bg px-3.5 text-[11px] font-semibold tracking-[0.06em] text-ed-gutter uppercase">
        Problems
        <span
          aria-live="polite"
          className={cn(
            'ml-auto font-medium tracking-normal normal-case',
            !pending && (errors.length ? 'text-[#FF8A80]' : 'text-syn-str'),
          )}
        >
          {pending || problems === null
            ? 'Checking types…'
            : errors.length
              ? `${errors.length} type error${errors.length === 1 ? '' : 's'}`
              : 'No type errors'}
        </span>
      </div>
      {!pending && problems !== null && (
        <ul className="py-1.5 font-mono text-[13px]" aria-label="Type errors">
          {errors.length === 0 && (
            <li className="flex items-center gap-2 px-3.5 py-1 text-syn-str">
              <CircleCheckIcon aria-hidden className="size-4" />
              TypeScript is happy with this code.
            </li>
          )}
          {errors.map((p, i) => (
            <li key={i} className="flex items-start gap-2 px-3.5 py-1 text-con-text">
              <CircleXIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-[#FF8A80]" />
              <span>
                <span className="text-ed-gutter">
                  Line {p.line}:{p.column}{' '}
                </span>
                {p.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
