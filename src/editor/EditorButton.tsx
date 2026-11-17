import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Buttons that live on the dark editor bar (same look in both themes). */
export function EditorButton({
  className,
  tone = 'plain',
  ...props
}: ComponentProps<typeof Button> & { tone?: 'plain' | 'run' | 'ok' }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className={cn(
        'h-7 gap-1.5 px-2.5 text-xs font-medium focus-visible:ring-syn-fn/60',
        tone === 'plain' && 'text-ed-btn hover:bg-ed-hover hover:text-ed-text',
        tone === 'ok' && 'text-syn-str hover:bg-ed-hover hover:text-syn-str',
        tone === 'run' &&
          'ml-1 bg-run px-3 text-white hover:bg-run-hover hover:text-white disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
