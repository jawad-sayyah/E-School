import { Children, isValidElement, useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SwordsIcon, TrophyIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { lessonKey } from '@/progress/ProgressStore';
import { Exercise } from './Exercise';
import { BuildUI, ReactExercise } from './ReactExercise';
import { TSExercise } from './TSExercise';
import { TestExercise } from './TestExercise';
import { ReactTestExercise } from './ReactTestExercise';
import { useLessonRef } from './LessonContext';

/**
 * A track's boss challenge: a set of exercises and questions. When every one is passed,
 * the lesson completes itself (boss lessons have no "Mark as complete" button).
 */
export function BossChallenge({ children }: { children?: ReactNode }) {
  const reduce = useReducedMotion();
  const lesson = useLessonRef();
  const store = useProgressStore();
  const snapshot = useProgress();

  const challenges = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => {
      const id = (el.props as { id?: unknown }).id;
      if (typeof id !== 'string') return null;
      const key = `${lesson.course}/${lesson.lesson}/${id}`;
      const done =
        el.type === Exercise ||
        el.type === ReactExercise ||
        el.type === BuildUI ||
        el.type === TSExercise ||
        el.type === TestExercise ||
        el.type === ReactTestExercise
          ? Boolean(snapshot.exercises[key]?.passed)
          : Boolean(snapshot.questions[key]?.correct);
      return { id, done };
    })
    .filter((c): c is { id: string; done: boolean } => c !== null);

  const defeated = challenges.filter((c) => c.done).length;
  const total = challenges.length;
  const won = total > 0 && defeated === total;
  const completed = Boolean(snapshot.lessons[lessonKey(lesson.course, lesson.lesson)]?.completed);

  useEffect(() => {
    if (won && !completed) void store.markComplete(lesson.course, lesson.lesson);
  }, [won, completed, store, lesson.course, lesson.lesson]);

  return (
    <section aria-labelledby="boss-title" className="mt-10">
      <div className="sticky top-16 z-20 -mx-2 mb-4 rounded-xl border border-danger/40 bg-background/95 px-4 py-3 backdrop-blur md:top-16">
        <div className="flex flex-wrap items-center gap-3">
          <SwordsIcon aria-hidden className="size-5 text-danger" />
          <h2
            id="boss-title"
            data-toc="Boss challenge"
            className="scroll-mt-24 font-heading text-xl font-bold"
          >
            Boss challenge
          </h2>
          <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
            {defeated} of {total} defeated
          </span>
        </div>
        <Progress
          value={total ? (defeated / total) * 100 : 0}
          indicatorClassName="bg-danger"
          className="mt-2 h-1.5"
          aria-label={`Boss challenge: ${defeated} of ${total} challenges defeated`}
        />
      </div>

      {children}

      {won && (
        <motion.div
          role="status"
          initial={reduce ? false : { opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="mt-10 flex items-center gap-4 rounded-2xl border-2 border-js/70 bg-js/10 p-6"
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-js text-on-light">
            <TrophyIcon aria-hidden className="size-7" />
          </span>
          <div>
            <p className="font-heading text-xl font-bold">Boss defeated!</p>
            <p className="text-sm text-muted-foreground">
              The lesson is complete. Finish every lesson in the track to unlock your certificate.
            </p>
          </div>
        </motion.div>
      )}
    </section>
  );
}
