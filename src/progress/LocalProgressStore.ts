import {
  EMPTY_PROGRESS,
  computeCourseProgress,
  lessonKey,
  type LessonProgress,
  type ProgressSnapshot,
  type ProgressStore,
} from './ProgressStore';

export const PROGRESS_STORAGE_KEY = 'eschool-progress-v1';

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Accepts only data shaped like a snapshot, so corrupted storage can't crash the app. */
function parseSnapshot(raw: string | null): ProgressSnapshot {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data) || data.version !== 1) return EMPTY_PROGRESS;
    const last = data.lastVisited;
    return {
      version: 1,
      lessons: isRecord(data.lessons) ? (data.lessons as ProgressSnapshot['lessons']) : {},
      quizzes: isRecord(data.quizzes) ? (data.quizzes as ProgressSnapshot['quizzes']) : {},
      exercises: isRecord(data.exercises) ? (data.exercises as ProgressSnapshot['exercises']) : {},
      lastVisited:
        isRecord(last) && typeof last.course === 'string' && typeof last.lesson === 'string'
          ? { course: last.course, lesson: last.lesson, at: Number(last.at) || 0 }
          : undefined,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

/** Progress kept in localStorage. Works (in memory only) when storage is unavailable. */
export class LocalProgressStore implements ProgressStore {
  private snapshot: ProgressSnapshot;
  private listeners = new Set<() => void>();

  constructor(
    private storage: Storage | null = safeStorage(),
    private key = PROGRESS_STORAGE_KEY,
    private now: () => number = Date.now,
  ) {
    this.snapshot = parseSnapshot(this.readRaw());
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== this.key) return;
        this.snapshot = parseSnapshot(event.newValue);
        this.emit();
      });
    }
  }

  getSnapshot = (): ProgressSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getLesson(course: string, lesson: string): LessonProgress {
    return this.snapshot.lessons[lessonKey(course, lesson)] ?? { completed: false };
  }

  getCourseProgress(course: string, lessonIds: string[]) {
    return computeCourseProgress(this.snapshot, course, lessonIds);
  }

  async markComplete(course: string, lesson: string, completed = true) {
    const key = lessonKey(course, lesson);
    const current = this.snapshot.lessons[key] ?? { completed: false };
    this.update({
      lessons: {
        ...this.snapshot.lessons,
        [key]: { ...current, completed, completedAt: completed ? this.now() : undefined },
      },
    });
  }

  async markVisited(course: string, lesson: string) {
    const key = lessonKey(course, lesson);
    const at = this.now();
    this.update({
      lessons: {
        ...this.snapshot.lessons,
        [key]: { ...(this.snapshot.lessons[key] ?? { completed: false }), visitedAt: at },
      },
      lastVisited: { course, lesson, at },
    });
  }

  async saveQuizScore(quizId: string, score: number, total: number) {
    const previous = this.snapshot.quizzes[quizId];
    if (previous && previous.best >= score) return;
    this.update({
      quizzes: { ...this.snapshot.quizzes, [quizId]: { best: score, total, at: this.now() } },
    });
  }

  async saveExerciseResult(exerciseId: string, passed: boolean) {
    // Once passed, an exercise stays passed: trying it again later shouldn't undo progress.
    if (this.snapshot.exercises[exerciseId]?.passed) return;
    this.update({
      exercises: { ...this.snapshot.exercises, [exerciseId]: { passed, at: this.now() } },
    });
  }

  async reset() {
    this.snapshot = EMPTY_PROGRESS;
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* storage unavailable: memory is already reset */
    }
    this.emit();
  }

  private readRaw(): string | null {
    try {
      return this.storage?.getItem(this.key) ?? null;
    } catch {
      return null;
    }
  }

  private update(patch: Partial<ProgressSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.snapshot));
    } catch {
      /* quota exceeded or storage blocked: keep going in memory */
    }
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
