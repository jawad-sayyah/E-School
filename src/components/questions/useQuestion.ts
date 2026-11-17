import { useCallback, useState } from 'react';
import type { CheckResult } from '@/questions/check';
import { XP_RULES } from '@/gamification/rules';
import { useLessonRef } from '@/components/mdx/LessonContext';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import type { QuestionKind } from './kinds';

export type QuestionStatus = 'idle' | 'wrong' | 'correct' | 'revealed';

/** Wrong tries before "Show answer" appears. */
export const REVEAL_AFTER = 2;

/**
 * State shared by every question type: attempts, the last check result,
 * saving the outcome to progress, and the XP it earned.
 */
export function useQuestion(id: string, kind: QuestionKind) {
  const lesson = useLessonRef();
  const key = `${lesson.course}/${lesson.lesson}/${id}`;
  const store = useProgressStore();
  const saved = useProgress().questions[key];
  const [status, setStatus] = useState<QuestionStatus>('idle');
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [xpEarned, setXpEarned] = useState(0);

  const submit = useCallback(
    (check: CheckResult) => {
      const tries = attempts + 1;
      setAttempts(tries);
      setResult(check);
      if (check.correct) {
        setStatus('correct');
        if (!saved?.correct) {
          setXpEarned(tries === 1 ? XP_RULES.questionFirstTry : XP_RULES.questionLater);
          void store.saveQuestionResult(key, { correct: true, attempts: tries, kind });
        }
      } else {
        setStatus('wrong');
      }
    },
    [attempts, key, kind, saved?.correct, store],
  );

  const retry = useCallback(() => setStatus('idle'), []);

  const reveal = useCallback(() => {
    setStatus('revealed');
    void store.saveQuestionResult(key, {
      correct: false,
      attempts: Math.max(1, attempts),
      revealed: true,
      kind,
    });
  }, [attempts, key, kind, store]);

  const reset = useCallback(() => {
    setStatus('idle');
    setAttempts(0);
    setResult(null);
    setXpEarned(0);
  }, []);

  return {
    key,
    status,
    attempts,
    result,
    xpEarned,
    /** Answered correctly at some point (this visit or before). */
    doneBefore: Boolean(saved?.correct),
    locked: status === 'correct' || status === 'revealed',
    canReveal: status === 'wrong' && attempts >= REVEAL_AFTER,
    submit,
    retry,
    reveal,
    reset,
  };
}

export type QuestionState = ReturnType<typeof useQuestion>;
