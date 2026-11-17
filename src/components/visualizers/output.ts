/** Console lines printed up to and including the current step of a visualizer. */
export function outputUpTo(frames: { out?: string }[], step: number): string[] {
  return frames
    .slice(0, step + 1)
    .map((f) => f.out)
    .filter((o): o is string => o !== undefined);
}
