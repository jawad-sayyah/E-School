import { useState } from 'react';
import { CheckIcon, LightbulbIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TextWithCode } from '@/components/InlineCode';
import { checkChoice } from '@/questions/check';
import { CodeBlock } from './CodeBlock';
import { useLessonRef } from './LessonContext';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';

export interface QuizQuestion {
  q: string;
  /** Optional code shown under the question ("What does this print?"). */
  code?: string;
  options: string[];
  /** Index of the correct option, or several indexes for a multi-select question. */
  answer: number | number[];
  explain: string;
  /** Extra help shown when the answer is wrong. */
  hint?: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  /** Defaults to the lesson ("course/lesson"). */
  id?: string;
  title?: string;
}

const LETTERS = 'ABCDEFGH';

/** Multiple choice (single or multi-select), one question at a time, with an explanation each. */
export function Quiz({ questions, id, title = 'Quiz' }: QuizProps) {
  const lesson = useLessonRef();
  const quizId = id ?? `${lesson.course}/${lesson.lesson}`;
  const store = useProgressStore();
  const best = useProgress().quizzes[quizId];

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const multi = Array.isArray(question.answer);
  const correctSet = new Set(Array.isArray(question.answer) ? question.answer : [question.answer]);
  const isLast = index === questions.length - 1;
  const wasRight = submitted && checkChoice(picked, question.answer).correct;

  const submit = (choice: number[]) => {
    setPicked(choice);
    setSubmitted(true);
    if (checkChoice(choice, question.answer).correct) setScore((s) => s + 1);
  };

  const choose = (option: number) => {
    if (submitted) return;
    if (multi) {
      setPicked((p) => (p.includes(option) ? p.filter((x) => x !== option) : [...p, option]));
    } else {
      submit([option]);
    }
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      void store.saveQuizScore(quizId, score, questions.length);
    } else {
      setIndex((i) => i + 1);
      setPicked([]);
      setSubmitted(false);
    }
  };

  const retry = () => {
    setIndex(0);
    setPicked([]);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
  };

  return (
    <Card className="my-10 gap-0 py-0" aria-labelledby={`${quizId}-title`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border py-4">
        <CardTitle>
          <h2
            id={`${quizId}-title`}
            data-toc={title}
            className="scroll-mt-24 font-heading text-lg font-semibold"
          >
            {title}
          </h2>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {best ? `Best score: ${best.best} / ${best.total}` : `${questions.length} questions`}
        </p>
      </CardHeader>
      <CardContent className="py-5">
        {finished ? (
          <div className="flex flex-col items-start gap-3" aria-live="polite">
            <p className="font-heading text-2xl font-semibold">
              {score} / {questions.length}
            </p>
            <p className="text-muted-foreground">
              {score === questions.length
                ? 'Perfect score. You’ve got this one.'
                : score >= questions.length / 2
                  ? 'Nice work. Read the explanations for the ones you missed, then try again.'
                  : 'Worth another look: scroll up through the lesson, then retry.'}
            </p>
            <Button variant="outline" onClick={retry}>
              <RotateCcwIcon aria-hidden />
              Retry
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Question {index + 1} of {questions.length}
              </span>
              <Progress
                value={((index + (submitted ? 1 : 0)) / questions.length) * 100}
                className="max-w-40"
                aria-label="Quiz progress"
              />
            </div>
            <p className="mb-3 font-medium">
              <TextWithCode text={question.q} />
              {multi && (
                <span className="ml-1 text-sm font-normal text-faint">(pick all that apply)</span>
              )}
            </p>
            {question.code && <CodeBlock lang="js" code={question.code} />}
            <div
              role={multi ? 'group' : 'radiogroup'}
              aria-label="Answers"
              className="mt-3 grid gap-2"
            >
              {question.options.map((option, i) => {
                const on = picked.includes(i);
                const state = !submitted
                  ? on
                    ? 'picked'
                    : 'idle'
                  : correctSet.has(i)
                    ? 'correct'
                    : on
                      ? 'wrong'
                      : 'other';
                return (
                  <Button
                    key={i}
                    variant="outline"
                    role={multi ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    onClick={() => choose(i)}
                    aria-disabled={submitted}
                    className={cn(
                      'h-auto min-h-10 justify-start gap-3 py-2 text-left whitespace-normal',
                      submitted && 'cursor-default',
                      state === 'picked' && 'border-primary bg-primary/10',
                      state === 'correct' && 'border-success bg-success/10 hover:bg-success/10',
                      state === 'wrong' && 'border-danger bg-danger/10 hover:bg-danger/10',
                      state === 'other' && 'opacity-70 hover:bg-transparent',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-6 shrink-0 place-items-center border border-border font-mono text-xs',
                        multi ? 'rounded-md' : 'rounded-full',
                      )}
                    >
                      {state === 'correct' ? (
                        <CheckIcon className="size-3.5 text-success" />
                      ) : state === 'wrong' ? (
                        <XIcon className="size-3.5 text-danger" />
                      ) : state === 'picked' && multi ? (
                        <CheckIcon className="size-3.5" />
                      ) : (
                        LETTERS[i]
                      )}
                    </span>
                    <span>
                      <TextWithCode text={option} />
                    </span>
                    {state === 'correct' && <span className="sr-only">(correct answer)</span>}
                    {state === 'wrong' && <span className="sr-only">(your answer, wrong)</span>}
                  </Button>
                );
              })}
            </div>
            <div aria-live="polite">
              {submitted && (
                <div
                  className={cn(
                    'mt-4 rounded-lg border px-4 py-3 text-sm',
                    wasRight ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10',
                  )}
                >
                  <p
                    className={cn('mb-1 font-semibold', wasRight ? 'text-success' : 'text-danger')}
                  >
                    {wasRight ? 'Correct!' : 'Not quite.'}
                  </p>
                  {!wasRight && question.hint && (
                    <p className="mb-1.5 flex gap-2 text-muted-foreground">
                      <LightbulbIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-tip" />
                      <span>
                        <TextWithCode text={question.hint} />
                      </span>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <TextWithCode text={question.explain} />
                  </p>
                </div>
              )}
            </div>
            {multi && !submitted && (
              <Button className="mt-4" onClick={() => submit(picked)} disabled={!picked.length}>
                Check
              </Button>
            )}
            {submitted && (
              <Button className="mt-4" onClick={next}>
                {isLast ? 'See my score' : 'Next question'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
