import { Worker } from 'node:worker_threads';
import type { WorkerLike } from '../src/runner/runCode';

/**
 * Runs the exact worker source the browser would run, but in a Node worker thread.
 * jsdom has no Worker, and this keeps the tests honest: a `while (true)` really
 * blocks a real thread, and terminate() really has to stop it.
 */
const SHIM = `
const { parentPort } = require('node:worker_threads');
globalThis.self = globalThis;
globalThis.postMessage = (msg) => parentPort.postMessage(msg);
globalThis.addEventListener = (type, fn) => {
  if (type === 'unhandledrejection') {
    process.on('unhandledRejection', (reason) => fn({ reason, preventDefault() {} }));
  }
};
`;

export function createNodeWorker(source: string): WorkerLike {
  const worker = new Worker(SHIM + source, { eval: true });
  const like: WorkerLike = {
    onmessage: null,
    onerror: null,
    terminate() {
      void worker.terminate();
    },
  };
  worker.on('message', (data: unknown) => like.onmessage?.({ data }));
  worker.on('error', (err: Error) => like.onerror?.({ message: `${err.name}: ${err.message}` }));
  return like;
}
