import { useMemo, useState, type ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon } from 'lucide-react';
import { TOKEN_CLASS, tokenize } from '@/editor/highlight';
import { checkOrder } from '@/questions/check';
import { shuffledIndexes } from '@/questions/shuffle';
import { getCodeBlocks } from '@/components/mdx/codeBlocks';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface OrderLinesProps {
  id: string;
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
  /** One fenced block with the lines in the CORRECT order (blank lines are ignored). */
  children?: ReactNode;
}

function LineRow({
  id,
  text,
  index,
  total,
  locked,
  mark,
  onMove,
}: {
  id: string;
  text: string;
  index: number;
  total: number;
  locked: boolean;
  mark?: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: locked,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-1 rounded-md border border-ed-line bg-ed-bg pr-1 font-mono text-[14px] text-ed-text',
        isDragging && 'relative z-10 border-syn-fn shadow-lg',
        mark === true && 'border-syn-str/70',
        mark === false && 'border-[#FF8A80]/70',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={locked}
        aria-label={`Move line ${index + 1}: ${text.trim()}. Use space to lift, arrows to move.`}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-md text-ed-gutter hover:text-ed-text focus-visible:ring-2 focus-visible:ring-syn-fn/60 focus-visible:outline-none disabled:cursor-default"
      >
        <GripVerticalIcon aria-hidden className="size-4" />
      </button>
      <code className="min-w-0 flex-1 overflow-x-auto py-1.5 whitespace-pre">
        {tokenize(text).map((t, i) => (
          <span key={i} className={TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ))}
      </code>
      {!locked && (
        <span className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            aria-label={`Move line ${index + 1} up`}
            className="grid size-7 place-items-center rounded text-ed-gutter hover:bg-ed-hover hover:text-ed-text disabled:opacity-30"
          >
            <ArrowUpIcon aria-hidden className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
            aria-label={`Move line ${index + 1} down`}
            className="grid size-7 place-items-center rounded text-ed-gutter hover:bg-ed-hover hover:text-ed-text disabled:opacity-30"
          >
            <ArrowDownIcon aria-hidden className="size-3.5" />
          </button>
        </span>
      )}
    </li>
  );
}

/** Order the lines (a Parsons problem): drag, or use the arrows, to put the code in order. */
export function OrderLines({
  id,
  prompt = 'Put the lines in the right order.',
  explain,
  hint,
  children,
}: OrderLinesProps) {
  const lines = useMemo(
    () => (getCodeBlocks(children)[0]?.code ?? '').split('\n').filter((l) => l.trim() !== ''),
    [children],
  );
  const q = useQuestion(id, 'order');
  const [order, setOrder] = useState<string[]>(() =>
    shuffledIndexes(lines.length, id).map((i) => `line-${i}`),
  );
  const shown = q.status === 'revealed' ? lines.map((_, i) => `line-${i}`) : order;
  const textOf = (key: string) => lines[Number(key.slice(5))];
  const marks = q.status === 'wrong' ? q.result?.parts : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((prev) => arrayMove(prev, from, to));
    if (q.status === 'wrong') q.retry();
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(order.indexOf(String(active.id)), order.indexOf(String(over.id)));
  };

  return (
    <QuestionCard
      kind="order"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint}
      onCheck={() => q.submit(checkOrder(order.map(textOf), lines))}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={shown} strategy={verticalListSortingStrategy}>
          <ol
            aria-label="Lines of code, in your order"
            className="my-3 space-y-1.5 rounded-xl bg-ed-tab p-2"
          >
            {shown.map((key, i) => (
              <LineRow
                key={key}
                id={key}
                text={textOf(key)}
                index={i}
                total={shown.length}
                locked={q.locked}
                mark={marks?.[i]}
                onMove={move}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </QuestionCard>
  );
}
