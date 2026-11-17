import type { WorkerLike } from './runCode';

/** Creates a real browser Worker from a Blob URL. Throws when workers aren't available. */
export function createBlobWorker(source: string): WorkerLike {
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('Web Workers are not available');
  }
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  let worker: Worker;
  try {
    worker = new Worker(url);
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  const like: WorkerLike = {
    onmessage: null,
    onerror: null,
    terminate() {
      worker.terminate();
      URL.revokeObjectURL(url);
    },
  };
  worker.onmessage = (event) => like.onmessage?.({ data: event.data });
  worker.onerror = (event) => {
    event.preventDefault();
    like.onerror?.({ message: event.message });
  };
  return like;
}
