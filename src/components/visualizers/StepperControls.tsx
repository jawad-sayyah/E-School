import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { EditorButton } from '@/editor/EditorButton';
import type { useStepper } from './useStepper';

/** Previous / Play / Next / Restart buttons plus a step counter, for the dark visualizer bar. */
export function StepperControls({
  stepper,
  count,
}: {
  stepper: ReturnType<typeof useStepper>;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <EditorButton onClick={stepper.restart} disabled={stepper.atStart} aria-label="Restart">
        <RotateCcwIcon aria-hidden />
      </EditorButton>
      <EditorButton onClick={stepper.prev} disabled={stepper.atStart} aria-label="Previous step">
        <ChevronLeftIcon aria-hidden />
      </EditorButton>
      <span className="min-w-16 text-center font-mono text-xs text-ed-btn" aria-live="polite">
        {stepper.step + 1} / {count}
      </span>
      <EditorButton onClick={stepper.next} disabled={stepper.atEnd} aria-label="Next step">
        <ChevronRightIcon aria-hidden />
      </EditorButton>
      <EditorButton
        tone="run"
        onClick={stepper.togglePlay}
        aria-label={stepper.playing ? 'Pause' : 'Play'}
      >
        {stepper.playing ? (
          <PauseIcon aria-hidden />
        ) : (
          <PlayIcon aria-hidden className="fill-current" />
        )}
        {stepper.playing ? 'Pause' : 'Play'}
      </EditorButton>
    </div>
  );
}
