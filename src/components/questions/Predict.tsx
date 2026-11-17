import { useId, useState, type ReactNode } from 'react';
import { PlayIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ConsoleView } from '@/editor/ConsoleView';
import { EditorButton } from '@/editor/EditorButton';
import { useRunner } from '@/editor/useRunner';
import { checkPredict } from '@/questions/check';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { CodeView } from './CodeView';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface PredictProps {
  id: string;
  /** Exactly what the console prints, one entry per line. */
  answer: string[];
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  file?: string;
  /** The code: one fenced block inside. */
  children?: ReactNode;
}

/** Predict the output: read the code and type what the console prints. */
export function Predict({
  id,
  answer,
  prompt = 'What does this code print? Type each line of output on its own line.',
  explain,
  hint,
  file = 'predict.js',
  children,
}: PredictProps) {
  const code = getCodeBlocks(children)[0]?.code ?? '';
  const q = useQuestion(id, 'predict');
  const [value, setValue] = useState('');
  const runner = useRunner();
  const inputId = useId();
  const answered = q.status === 'correct' || q.status === 'revealed';

  return (
    <QuestionCard
      kind="predict"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint}
      canCheck={value.trim() !== ''}
      onCheck={() => q.submit(checkPredict(value, answer))}
    >
      <CodeView
        code={code}
        file={file}
        actions={
          answered && (
            <EditorButton
              tone="run"
              onClick={() => runner.run(code)}
              disabled={runner.phase === 'running'}
            >
              <PlayIcon aria-hidden className="fill-current" />
              Run it
            </EditorButton>
          )
        }
      >
        {answered && (
          <ConsoleView
            lines={
              runner.phase === 'idle'
                ? answer.map((text) => ({
                    level: text.startsWith('Uncaught ') ? ('error' as const) : ('log' as const),
                    text,
                  }))
                : runner.lines
            }
            state={
              runner.phase === 'idle'
                ? 'The real output'
                : runner.phase === 'running'
                  ? 'Running…'
                  : 'Output · just now'
            }
          />
        )}
      </CodeView>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-muted-foreground">
        Your prediction
      </label>
      <Textarea
        id={inputId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            (e.ctrlKey || e.metaKey) &&
            value.trim() &&
            q.status === 'idle'
          ) {
            e.preventDefault();
            q.submit(checkPredict(value, answer));
          }
        }}
        readOnly={q.locked}
        spellCheck={false}
        rows={Math.max(2, answer.length + 1)}
        placeholder={
          answer.length === 1 ? 'One line of output' : `${answer.length} lines of output`
        }
        className={cn(
          'font-mono text-[13.5px]',
          q.status === 'correct' && 'border-success/60',
          q.status === 'wrong' && 'border-danger/60',
        )}
      />
    </QuestionCard>
  );
}
