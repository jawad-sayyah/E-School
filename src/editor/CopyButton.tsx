import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { EditorButton } from './EditorButton';

/** Copies text; falls back to "Press Ctrl+C" when the clipboard API is blocked. */
export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('manual');
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1400);
  };

  return (
    <EditorButton tone={state === 'copied' ? 'ok' : 'plain'} onClick={copy} aria-label={label}>
      {state === 'copied' ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
      <span aria-live="polite">
        {state === 'copied' ? 'Copied' : state === 'manual' ? 'Press Ctrl+C' : 'Copy'}
      </span>
    </EditorButton>
  );
}
