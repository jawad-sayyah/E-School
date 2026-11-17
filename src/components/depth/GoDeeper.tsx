import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDownIcon, CogIcon, MicroscopeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** "Go deeper": an expandable deep dive below the quick explanation. */
export function GoDeeper({ title, children }: { title: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const contentId = useId();

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MicroscopeIcon aria-hidden className="size-4 shrink-0 text-syn-kw" />
        <span className="flex-1">
          <span className="block text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
            Go deeper
          </span>
          <span className="font-medium">{title}</span>
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-faint transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="content"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="border-t border-border px-4 pt-1 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "How it works": a short, always-visible explanation of what happens underneath. */
export function HowItWorks({
  title = 'How it works',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <aside className="my-5 rounded-xl border-l-[3px] border-syn-fn bg-syn-fn/5 px-4 py-3">
      <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-syn-fn uppercase">
        <CogIcon aria-hidden className="size-3.5" />
        {title}
      </p>
      <div className="text-sm [&_li]:text-sm [&_p]:my-1.5 [&_p]:text-sm">{children}</div>
    </aside>
  );
}
