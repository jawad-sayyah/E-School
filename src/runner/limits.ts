/**
 * Safety limits for every run. One object, so lessons and tests can see (and override) them.
 *  - MAX_LINES: console lines before the run is stopped (catches "infinite output").
 *  - MAX_MS:    longest the main code may run (catches infinite loops).
 *  - AFTER_MS:  how long timers may keep printing after the main code finished.
 *  - MAX_CHARS: longest single console line shown.
 *  - MAX_ITEMS: array items / object keys shown per value.
 */
export const LIMITS = {
  MAX_LINES: 200,
  MAX_MS: 4000,
  AFTER_MS: 1500,
  MAX_CHARS: 2000,
  MAX_ITEMS: 100,
} as const;

export interface Limits {
  MAX_LINES: number;
  MAX_MS: number;
  AFTER_MS: number;
  MAX_CHARS: number;
  MAX_ITEMS: number;
}

export const RUNNER_MESSAGES = {
  lines: (max: number) => `Stopped after ${max} lines of output. Is a loop running forever?`,
  timeout: (ms: number) =>
    `Stopped: the code ran for more than ${ms / 1000} seconds. Is there an infinite loop?`,
  timers: (ms: number) =>
    `Timers were still running ${ms / 1000} seconds after the code finished, so they were stopped.`,
  empty: 'No output. Add console.log() to see values.',
  unavailable: 'Live run isn’t available in this browser, so this is the expected output.',
};
