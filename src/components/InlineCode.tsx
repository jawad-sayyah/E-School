import type { ComponentProps, ReactNode } from 'react';
import { inlineParts } from '@/lib/inline';
import { cn } from '@/lib/utils';

export function InlineCode({ className, ...props }: ComponentProps<'code'>) {
  return (
    <code
      className={cn(
        'rounded-[5px] border border-border bg-muted px-1.5 py-px font-mono text-[0.88em] font-medium [overflow-wrap:anywhere]',
        className,
      )}
      {...props}
    />
  );
}

/** Renders a plain string with inline code and bold (see `inlineParts`). */
export function TextWithCode({ text }: { text: string }): ReactNode {
  return (
    <>
      {inlineParts(text).map((part, i) =>
        part.kind === 'code' ? (
          <InlineCode key={i}>{part.value}</InlineCode>
        ) : part.kind === 'bold' ? (
          <strong key={i} className="font-semibold text-foreground">
            <TextWithCode text={part.value} />
          </strong>
        ) : (
          part.value
        ),
      )}
    </>
  );
}
