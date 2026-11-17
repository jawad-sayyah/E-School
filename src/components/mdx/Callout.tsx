import type { ReactNode } from 'react';
import { AtomIcon, LightbulbIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutType = 'tip' | 'warn' | 'react';

const STYLES: Record<CalloutType, { box: string; icon: ReactNode; label: string }> = {
  tip: {
    box: 'border-js bg-tip-bg text-tip',
    icon: <LightbulbIcon aria-hidden className="size-4" />,
    label: 'Tip',
  },
  warn: {
    box: 'border-danger bg-warn-badge-bg text-warn-badge',
    icon: <TriangleAlertIcon aria-hidden className="size-4" />,
    label: 'Watch out',
  },
  react: {
    box: 'border-react bg-react-badge-bg text-react-badge',
    icon: <AtomIcon aria-hidden className="size-4" />,
    label: 'In React',
  },
};

/** A short highlighted note. */
export function Callout({
  type = 'tip',
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children?: ReactNode;
}) {
  const style = STYLES[type];
  return (
    <aside
      role="note"
      className={cn(
        'my-6 flex gap-3 rounded-md border-l-[3px] px-4 py-3 text-sm leading-relaxed [&_p]:my-0 [&_p]:text-inherit',
        style.box,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div>
        <strong className="font-semibold">{title ?? style.label}: </strong>
        {children}
      </div>
    </aside>
  );
}
