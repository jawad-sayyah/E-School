export interface LessonProgress {
  completed: boolean;
  completedAt?: number;
  visitedAt?: number;
}

export interface QuizScore {
  best: number;
  total: number;
  at: number;
}

export interface ExerciseResult {
  passed: boolean;
  at: number;
}

export interface ProgressSnapshot {
  version: 1;
  /** Keyed by "course/lesson". */
  lessons: Record<string, LessonProgress>;
  /** Keyed by quiz id, e.g. "js-basics/arrays-basics". */
  quizzes: Record<string, QuizScore>;
  /** Keyed by exercise id, e.g. "js-basics/arrays-methods/get-total". */
  exercises: Record<string, ExerciseResult>;
  lastVisited?: { course: string; lesson: string; at: number };
}

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
}

/**
 * Where progress lives. Reads are synchronous (from an in-memory snapshot) so components
 * render immediately; writes are async and notify subscribers. A Supabase implementation
 * can load its snapshot, then call the listeners — components don't change.
 */
export interface ProgressStore {
  getSnapshot(): ProgressSnapshot;
  subscribe(listener: () => void): () => void;
  getLesson(course: string, lesson: string): LessonProgress;
  getCourseProgress(course: string, lessonIds: string[]): CourseProgress;
  markComplete(course: string, lesson: string, completed?: boolean): Promise<void>;
  markVisited(course: string, lesson: string): Promise<void>;
  saveQuizScore(quizId: string, score: number, total: number): Promise<void>;
  saveExerciseResult(exerciseId: string, passed: boolean): Promise<void>;
  reset(): Promise<void>;
}

export const EMPTY_PROGRESS: ProgressSnapshot = {
  version: 1,
  lessons: {},
  quizzes: {},
  exercises: {},
};

export const lessonKey = (course: string, lesson: string) => `${course}/${lesson}`;

export function computeCourseProgress(
  snapshot: ProgressSnapshot,
  course: string,
  lessonIds: string[],
): CourseProgress {
  const total = lessonIds.length;
  const completed = lessonIds.filter(
    (id) => snapshot.lessons[lessonKey(course, id)]?.completed,
  ).length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}
