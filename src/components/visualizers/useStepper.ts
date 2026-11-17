import { useCallback, useEffect, useState } from 'react';

/** Step-through state for visualizers: previous / next / play / restart. */
export function useStepper(count: number, intervalMs = 1300) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = Math.max(0, count - 1);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= last) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing, last, intervalMs]);

  const next = useCallback(() => setStep((s) => Math.min(last, s + 1)), [last]);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const restart = useCallback(() => {
    setStep(0);
    setPlaying(false);
  }, []);
  const togglePlay = useCallback(() => {
    setStep((s) => (s >= last ? 0 : s));
    setPlaying((p) => !p);
  }, [last]);

  return {
    step,
    setStep,
    playing,
    next,
    prev,
    restart,
    togglePlay,
    atStart: step === 0,
    atEnd: step >= last,
  };
}
