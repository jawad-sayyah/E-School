/** A small seeded random generator (mulberry32), so a shuffle is the same on every visit. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns the indexes 0..n-1 in a shuffled order that depends only on `seed`.
 * For n > 1 the result is never already in order, so a question never starts solved.
 */
export function shuffledIndexes(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return order;
  const random = mulberry32(hash(seed));
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.some((v, i) => v !== i)) return order;
  }
  // Fall back to a rotation, which is never the identity.
  return order.map((_, i) => (i + 1) % n);
}
