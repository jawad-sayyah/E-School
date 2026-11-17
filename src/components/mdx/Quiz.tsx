import { useState } from 'react';
import { CheckIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TextWithCode } from '@/components/InlineCode';
import { CodeBlock } from './CodeBlock';
import { useLessonRef } from './LessonContext';
import { useProgress, useProgressStore } from '@/progress/ProgressContext';
import { cn } from '@/lib/utils';

export interface QuizQuestion {
  q: string;
  /** Optional code shown under the question ("What does this print?"). */
  code?: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  explain: string;
}

interface QuizProps {
  questions: QuizQuestion[];
  /** Defaults to the lesson ("course/lesson"). */
  id?: string;
  title?: string;
}

const LETTERS = 'ABCDEFGH';

/** Multiple choice, one question at a time, with an explanation after each answer. */
export function Quiz({ questions, id, title = 'Quiz' }: QuizProps) {
  const lesson = useLessonRef();
  const quizId = id ?? `${lesson.course}/${lesson.lesson}`;
  const store = useProgressStore();
  const best = useProgress().quizzes[quizId];

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const answered = picked !== null;
  const isLast = index === questions.length - 1;

  const choose = (option: number) => {
    if (answered) return;
    setPicked(option);
    if (option === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
      void store.saveQuizScore(quizId, score, questions.length);
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const retry = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <Card className="my-10 gap-0 py-0" aria-labelledby="quiz-title">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border py-4">
        <CardTitle>
          <h2
            id="quiz-title"
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
                value={((index + (answered ? 1 : 0)) / questions.length) * 100}
                className="max-w-40"
                aria-label="Quiz progress"
              />
            </div>
            <p className="mb-3 font-medium">
              <TextWithCode text={question.q} />
            </p>
            {question.code && <CodeBlock lang="js" code={question.code} />}
            <div role="group" aria-label="Answers" className="mt-3 grid gap-2">
              {question.options.map((option, i) => {
                const correct = i === question.answer;
                const state = !answered
                  ? 'idle'
                  : correct
                    ? 'correct'
                    : i === picked
                      ? 'wrong'
                      : 'other';
                return (
                  <Button
                    key={i}
                    variant="outline"
                    onClick={() => choose(i)}
                    aria-disabled={answered}
                    className={cn(
                      'h-auto min-h-10 justify-start gap-3 py-2 text-left whitespace-normal',
                      answered && 'cursor-default',
                      state === 'correct' && 'border-success bg-success/10 hover:bg-success/10',
                      state === 'wrong' && 'border-danger bg-danger/10 hover:bg-danger/10',
                      state === 'other' && 'opacity-70 hover:bg-transparent',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-md border border-border font-mono text-xs"
                    >
                      {state === 'correct' ? (
                        <CheckIcon className="size-3.5 text-success" />
                      ) : state === 'wrong' ? (
                        <XIcon className="size-3.5 text-danger" />
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
              {answered && (
                <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
                  <p
                    className={cn(
                      'mb-1 font-semibold',
                      picked === question.answer ? 'text-success' : 'text-danger',
                    )}
                  >
                    {picked === question.answer ? 'Correct!' : 'Not quite.'}
                  </p>
                  <p className="text-muted-foreground">
                    <TextWithCode text={question.explain} />
                  </p>
                </div>
              )}
            </div>
            {answered && (
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
