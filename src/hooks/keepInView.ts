/**
 * Scrolls a sidebar (not the page) so `item` stays visible, centring it when it
 * drifts within `margin` px of an edge. Ported from the JS reference page.
 */
export function keepInView(container: HTMLElement | null, item: HTMLElement | null, margin = 80) {
  if (!container || !item || container.scrollHeight <= container.clientHeight) return;
  const itemTop =
    item.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  const visibleTop = container.scrollTop + margin;
  const visibleBottom = container.scrollTop + container.clientHeight - margin;
  if (itemTop < visibleTop || itemTop + item.offsetHeight > visibleBottom) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      top: itemTop - container.clientHeight / 2 + item.offsetHeight / 2,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }
}
