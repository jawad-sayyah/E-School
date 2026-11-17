import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const LANG_BADGE: Record<string, { label: string; className: string }> = {
  js: { label: 'JS', className: 'bg-js text-on-light' },
  javascript: { label: 'JS', className: 'bg-js text-on-light' },
  jsx: { label: 'JSX', className: 'bg-react text-on-light' },
  ts: { label: 'TS', className: 'bg-ts text-on-dark' },
  tsx: { label: 'TSX', className: 'bg-ts text-on-dark' },
  html: { label: 'HTML', className: 'bg-syn-tag text-on-light' },
  css: { label: 'CSS', className: 'bg-syn-fn text-on-light' },
  json: { label: '{}', className: 'bg-syn-type text-on-light' },
  bash: { label: '$', className: 'bg-ed-btn text-on-light' },
};

export function langBadge(lang: string) {
  return (
    LANG_BADGE[lang] ?? { label: lang.toUpperCase() || 'TXT', className: 'bg-ed-btn text-on-light' }
  );
}

interface EditorFrameProps {
  file: string;
  lang: string;
  edited?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** The dark "real editor" chrome: a file tab with a language badge, plus action buttons. */
export function EditorFrame({
  file,
  lang,
  edited,
  actions,
  children,
  className,
}: EditorFrameProps) {
  const badge = langBadge(lang);
  return (
    <div
      className={cn(
        'my-4 overflow-hidden rounded-xl border border-ed-line bg-ed-bg shadow-[0_8px_24px_-12px_rgb(15_18_38/0.35)]',
        className,
      )}
    >
      <div className="flex h-10 items-center border-b border-ed-line bg-ed-tab pr-2">
        <div className="flex h-full min-w-0 items-center gap-2 border-r border-ed-line bg-ed-bg px-4 font-mono text-[13px] text-ed-text">
          <span
            className={cn('rounded-[3px] px-1 font-mono text-[10px] font-bold', badge.className)}
          >
            {badge.label}
          </span>
          <span className="truncate">{file}</span>
          {edited && (
            <span className="size-[7px] shrink-0 rounded-full bg-ed-text" title="Edited" />
          )}
          {edited && <span className="sr-only">(edited)</span>}
        </div>
        <div className="flex flex-1 items-center justify-end gap-1 pl-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}
