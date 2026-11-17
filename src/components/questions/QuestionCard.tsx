import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckIcon, EyeIcon, LightbulbIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextWithCode } from '@/components/InlineCode';
import { cn } from '@/lib/utils';
import { QUESTION_KINDS, type QuestionKind } from './kinds';
import type { QuestionState } from './useQuestion';

interface QuestionCardProps {
  kind: QuestionKind;
  q: QuestionState;
  /** The question itself (one or two sentences). */
  prompt: ReactNode;
  /** Shown after a correct answer or when the answer is revealed. */
  explain?: ReactNode;
  /** Extra hint shown on a wrong answer, after the automatic one. */
  hint?: string;
  /** False while the answer is incomplete (disables Check). */
  canCheck?: boolean;
  onCheck: () => void;
  /** Called when the student asks to see the answer. */
  onReveal?: () => void;
  /** Called on "Try again" (e.g. to clear wrong marks). */
  onRetry?: () => void;
  children: ReactNode;
}

function renderText(node: ReactNode) {
  return typeof node === 'string' ? <TextWithCode text={node} /> : node;
}

/** The shell around every question: label, prompt, Check, feedback, hints and XP. */
export function QuestionCard({
  kind,
  q,
  prompt,
  explain,
  hint,
  canCheck = true,
  onCheck,
  onReveal,
  onRetry,
  children,
}: QuestionCardProps) {
  const reduce = useReducedMotion();
  const meta = QUESTION_KINDS[kind];
  const Icon = meta.icon;
  const answered = q.status === 'correct' || q.status === 'revealed';

  return (
    <Card
      data-question={kind}
      className={cn(
        'my-6 gap-0 overflow-hidden py-0 transition-colors duration-300',
        q.status === 'correct' && 'border-success/60',
        q.status === 'wrong' && 'border-danger/50',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-5 py-2.5">
        <Icon aria-hidden className="size-4 text-faint" />
        <span className="text-xs font-semibold tracking-wide text-faint uppercase">
          {meta.label}
        </span>
        {q.doneBefore && q.status === 'idle' && (
          <Badge variant="outline" className="ml-auto border-success/50 text-success">
            <CheckIcon aria-hidden />
            Done before
          </Badge>
        )}
      </div>

      <div className="px-5 pt-4 pb-5">
        <div className="mb-3 font-medium text-foreground [&_p]:my-0">{renderText(prompt)}</div>
        {children}

        <div aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {q.status !== 'idle' && (
              <motion.div
                key={q.status + q.attempts}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'mt-4 rounded-lg border px-4 py-3 text-sm',
                  q.status === 'correct' && 'border-success/40 bg-success/10',
                  q.status === 'wrong' && 'border-danger/40 bg-danger/10',
                  q.status === 'revealed' && 'border-border bg-muted',
                )}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  {q.status === 'correct' && <span className="text-success">Correct!</span>}
                  {q.status === 'wrong' && <span className="text-danger">Not yet.</span>}
                  {q.status === 'revealed' && <span>Here’s the answer.</span>}
                  {q.status === 'correct' && q.xpEarned > 0 && (
                    <motion.span
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      className="ml-auto inline-flex items-center gap-1 rounded-full bg-js px-2 py-0.5 text-xs font-bold text-on-light"
                    >
                      <SparklesIcon aria-hidden className="size-3" />+{q.xpEarned} XP
                    </motion.span>
                  )}
                </div>
                {q.status === 'wrong' && (
                  <div className="space-y-1 text-muted-foreground">
                    {q.result?.hint && (
                      <p className="flex gap-2">
                        <LightbulbIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-tip" />
                        <span>
                          <TextWithCode text={q.result.hint} />
                        </span>
                      </p>
                    )}
                    {hint && (q.attempts >= 2 || !q.result?.hint) && (
                      <p className="flex gap-2">
                        <LightbulbIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-tip" />
                        <span>
                          <TextWithCode text={hint} />
                        </span>
                      </p>
                    )}
                    {!q.result?.hint && !hint && <p>Have another look and try again.</p>}
                  </div>
                )}
                {answered && explain && (
                  <div className="text-muted-foreground [&_p]:my-0">{renderText(explain)}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {q.status === 'idle' && (
            <Button onClick={onCheck} disabled={!canCheck}>
              Check
            </Button>
          )}
          {q.status === 'wrong' && (
            <Button
              variant="outline"
              onClick={() => {
                onRetry?.();
                q.retry();
              }}
            >
              <RotateCcwIcon aria-hidden />
              Try again
            </Button>
          )}
          {q.canReveal && (
            <Button
              variant="ghost"
              onClick={() => {
                onReveal?.();
                q.reveal();
              }}
            >
              <EyeIcon aria-hidden />
              Show answer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
