import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function InlineCode({ className, ...props }: ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'rounded-[5px] border border-border bg-muted px-1.5 py-px font-mono text-[0.88em] font-medium',
        className,
      )}
      {...props}
    />
  );
}

/** Renders a plain string, turning `backtick` parts into inline code (for quiz text). */
export function TextWithCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <InlineCode key={i}>{part.slice(1, -1)}</InlineCode>
        ) : (
          part
        ),
      )}
    </>
  );
}
