import { useEffect, useState } from 'react';

/** Returns the id of the heading currently at the top of the viewport. */
export function useScrollSpy(ids: string[]): string | null {
  const key = ids.join('|');
  // Remember which heading list the active id belongs to, so a new page starts at its first heading.
  const [seen, setSeen] = useState<{ key: string; id: string } | null>(null);

  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length || typeof IntersectionObserver === 'undefined') return;
    const elements = list
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setSeen({ key, id: visible[0].target.id });
      },
      { rootMargin: '-80px 0px -65% 0px' },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return seen?.key === key ? seen.id : (ids[0] ?? null);
}
