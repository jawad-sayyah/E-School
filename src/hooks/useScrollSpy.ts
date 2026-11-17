import { useEffect, useState } from 'react';

/** How far below the top of the viewport a heading counts as "reached" (header + breathing room). */
const ACTIVATION_LINE = 120;

/**
 * Returns the id of the section being read: the last element (in `ids` order) whose top
 * has scrolled above the activation line. Recomputed on scroll, at most once per frame.
 */
export function useScrollSpy(ids: string[]): string | null {
  const key = ids.join('|');
  // Remember which id list the active id belongs to, so a new page starts at its first item.
  const [seen, setSeen] = useState<{ key: string; id: string } | null>(null);

  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el || el.offsetParent === null) continue; // missing or hidden
        if (el.getBoundingClientRect().top <= ACTIVATION_LINE) current = id;
        else break;
      }
      // At the very bottom, the last item wins even if it can't reach the line.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        const visible = list.filter((id) => document.getElementById(id)?.offsetParent);
        current = visible[visible.length - 1] ?? current;
      }
      setSeen((prev) => (prev?.key === key && prev.id === current ? prev : { key, id: current }));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Layout can change without a scroll (content loading, fonts, filtering): re-check then too.
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [key]);

  return seen?.key === key ? seen.id : (ids[0] ?? null);
}
