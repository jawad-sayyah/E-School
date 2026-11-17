import { useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { TextWithCode } from '@/components/InlineCode';
import { checkBuckets } from '@/questions/check';
import { shuffledIndexes } from '@/questions/shuffle';
import { cn } from '@/lib/utils';
import { QuestionCard } from './QuestionCard';
import { useQuestion } from './useQuestion';

interface SortBucketsProps {
  id: string;
  /** Bucket titles. */
  buckets: string[];
  /** [item, bucket index] pairs. */
  items: [string, number][];
  prompt?: ReactNode;
  explain?: ReactNode;
  hint?: string;
}

function Chip({
  index,
  text,
  locked,
  selected,
  mark,
  onClick,
}: {
  index: number;
  text: string;
  locked: boolean;
  selected: boolean;
  mark?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${index}`,
    disabled: locked,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onClick}
      aria-pressed={selected}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'inline-flex touch-none items-center gap-1.5 rounded-md border-2 border-border bg-card px-2.5 py-1.5 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        !locked && 'cursor-grab hover:border-faint',
        isDragging && 'relative z-20 cursor-grabbing border-primary shadow-lg',
        selected && 'border-primary ring-2 ring-primary/30',
        mark === true && 'border-success/70',
        mark === false && 'border-danger/70',
      )}
    >
      <TextWithCode text={text} />
      {mark !== undefined && (
        <span
          aria-label={mark ? 'right bucket' : 'wrong bucket'}
          className={mark ? 'text-success' : 'text-danger'}
        >
          {mark ? '✓' : '✗'}
        </span>
      )}
    </button>
  );
}

function Zone({
  id,
  title,
  onClick,
  highlight,
  children,
}: {
  id: string;
  title: string;
  onClick: () => void;
  highlight: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-28 flex-col rounded-xl border-2 border-dashed border-border p-3 transition-colors',
        isOver && 'border-primary bg-primary/5',
        highlight && 'border-primary/60',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="mb-2 self-start rounded text-left text-xs font-semibold tracking-wide text-faint uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {title}
      </button>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Sort into buckets: drag each item (or tap it, then tap a bucket). */
export function SortBuckets({
  id,
  buckets,
  items,
  prompt = 'Sort each item into the right bucket.',
  explain,
  hint,
}: SortBucketsProps) {
  const q = useQuestion(id, 'buckets');
  const poolOrder = useMemo(() => shuffledIndexes(items.length, id), [items.length, id]);
  const [placed, setPlaced] = useState<(number | null)[]>(() => items.map(() => null));
  const [selected, setSelected] = useState<number | null>(null);
  const shown = q.status === 'revealed' ? items.map(([, b]) => b) : placed;
  const marks = q.status === 'wrong' || q.status === 'correct' ? q.result?.parts : undefined;

  const sensors = useSensors(
    // Pointer only: keyboard users tap an item, then a bucket title (plain buttons).
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const place = (item: number, bucket: number | null) => {
    if (q.locked) return;
    if (q.status === 'wrong') q.retry();
    setPlaced((p) => p.map((v, i) => (i === item ? bucket : v)));
    setSelected(null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const item = Number(String(active.id).slice(5));
    const target = String(over.id);
    place(item, target === 'pool' ? null : Number(target.slice(7)));
  };

  const chip = (i: number) => (
    <Chip
      key={i}
      index={i}
      text={items[i][0]}
      locked={q.locked}
      selected={selected === i}
      mark={marks?.[i]}
      onClick={() => !q.locked && setSelected(selected === i ? null : i)}
    />
  );

  return (
    <QuestionCard
      kind="buckets"
      q={q}
      prompt={prompt}
      explain={explain}
      hint={hint}
      canCheck={placed.some((p) => p !== null)}
      onCheck={() =>
        q.submit(
          checkBuckets(
            placed,
            items.map(([, b]) => b),
          ),
        )
      }
    >
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="my-3 space-y-3">
          <Zone
            id="pool"
            title={shown.every((p) => p !== null) ? 'All sorted' : 'Items to sort'}
            highlight={false}
            onClick={() => selected !== null && place(selected, null)}
          >
            {poolOrder.filter((i) => shown[i] === null).map(chip)}
          </Zone>
          <div
            className={cn(
              'grid gap-3',
              buckets.length === 2 && 'sm:grid-cols-2',
              buckets.length >= 3 && 'sm:grid-cols-3',
            )}
          >
            {buckets.map((title, b) => (
              <Zone
                key={b}
                id={`bucket-${b}`}
                title={title}
                highlight={selected !== null}
                onClick={() => selected !== null && place(selected, b)}
              >
                {poolOrder.filter((i) => shown[i] === b).map(chip)}
              </Zone>
            ))}
          </div>
          {selected !== null && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Now tap a bucket title to drop “{items[selected][0]}” there.
            </p>
          )}
        </div>
      </DndContext>
    </QuestionCard>
  );
}
