import type { MDXComponents } from 'mdx/types';
import { InlineCode } from '@/components/InlineCode';
import { slugify } from '@/lib/slug';
import { cn } from '@/lib/utils';
import { BossChallenge } from './BossChallenge';
import { BuildUI, ReactExercise } from './ReactExercise';
import { ReactPlayground } from './ReactPlayground';
import { Callout } from './Callout';
import { MdxLink } from './MdxLink';
import { CodeBlock } from './CodeBlock';
import { Compare } from './Compare';
import { Concept } from './Concept';
import { Exercise } from './Exercise';
import { Playground } from './Playground';
import { Quiz } from './Quiz';
import { GoDeeper, HowItWorks } from '@/components/depth/GoDeeper';
import { CodeTrace } from '@/components/visualizers/CodeTrace';
import { EventLoop } from '@/components/visualizers/EventLoop';
import { RenderCycle } from '@/components/visualizers/RenderCycle';
import { Choice } from '@/components/questions/Choice';
import { CodeReview } from '@/components/questions/CodeReview';
import { FillBlanks } from '@/components/questions/FillBlanks';
import { MatchPairs } from '@/components/questions/MatchPairs';
import { OrderLines } from '@/components/questions/OrderLines';
import { Practice } from '@/components/questions/Practice';
import { Predict } from '@/components/questions/Predict';
import { SortBuckets } from '@/components/questions/SortBuckets';
import { SpotTheBug } from '@/components/questions/SpotTheBug';
import { TraceState } from '@/components/questions/TraceState';
import { TrueFalse } from '@/components/questions/TrueFalse';

function textOf(children: unknown): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  return '';
}

/**
 * Every Markdown element maps to a styled component, so no browser-default HTML
 * ever shows up in a lesson. Custom lesson components are registered here too.
 */
export const mdxComponents: MDXComponents = {
  h2: ({ children, className, ...props }) => {
    const id = slugify(textOf(children));
    return (
      <h2
        id={id}
        data-toc={textOf(children)}
        className={cn(
          'mt-12 mb-3 scroll-mt-24 font-heading text-2xl font-bold tracking-tight',
          className,
        )}
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ className, ...props }) => (
    <h3 className={cn('mt-8 mb-2 font-heading text-lg font-semibold', className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn('mt-6 mb-2 font-heading text-base font-semibold', className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn('my-3 max-w-[68ch] text-muted-foreground', className)} {...props} />
  ),
  a: MdxLink,
  strong: ({ className, ...props }) => (
    <strong className={cn('font-semibold text-foreground', className)} {...props} />
  ),
  em: ({ className, ...props }) => <em className={cn('italic', className)} {...props} />,
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        'my-3 max-w-[68ch] list-disc space-y-1.5 pl-6 text-muted-foreground marker:text-faint',
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        'my-3 max-w-[68ch] list-decimal space-y-1.5 pl-6 text-muted-foreground marker:text-faint',
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => <li className={cn('pl-1', className)} {...props} />,
  code: InlineCode,
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        'my-5 border-l-[3px] border-border pl-4 text-muted-foreground italic',
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn('my-10 border-border', className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-5 overflow-x-auto rounded-lg border border-border">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => <thead className={cn('bg-muted', className)} {...props} />,
  th: ({ className, ...props }) => (
    <th
      className={cn('border-b border-border px-3 py-2 text-left font-semibold', className)}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn('border-b border-border px-3 py-2 text-muted-foreground', className)}
      {...props}
    />
  ),
  img: ({ className, alt = '', ...props }) => (
    <img alt={alt} className={cn('my-5 rounded-lg border border-border', className)} {...props} />
  ),
  CodeBlock,
  Concept,
  Playground,
  Exercise,
  Quiz,
  Callout,
  Compare,
  // depth layer and visualizers
  HowItWorks,
  GoDeeper,
  CodeTrace,
  EventLoop,
  RenderCycle,
  BossChallenge,
  ReactPlayground,
  ReactExercise,
  BuildUI,
  // question types
  Practice,
  Choice,
  Predict,
  FillBlanks,
  OrderLines,
  MatchPairs,
  SortBuckets,
  SpotTheBug,
  TraceState,
  CodeReview,
  TrueFalse,
};
