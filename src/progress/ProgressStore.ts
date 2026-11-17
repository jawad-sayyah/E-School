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

export interface QuestionResult {
  /** Answered correctly (on any attempt). Once true, it stays true. */
  correct: boolean;
  /** Attempts it took (wrong tries + the final one). */
  attempts: number;
  /** The student gave up and looked at the answer. */
  revealed: boolean;
  /** Question type, e.g. "predict" or "spot-bug" (for badges). */
  kind?: string;
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
  /** Keyed by question id, e.g. "js-basics/loops/predict-for". */
  questions: Record<string, QuestionResult>;
  /** Days with learning activity, as local "YYYY-MM-DD" keys, oldest first (for streaks). */
  activity: string[];
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
  saveQuestionResult(
    questionId: string,
    result: { correct: boolean; attempts: number; revealed?: boolean; kind?: string },
  ): Promise<void>;
  reset(): Promise<void>;
}

export const EMPTY_PROGRESS: ProgressSnapshot = {
  version: 1,
  lessons: {},
  quizzes: {},
  exercises: {},
  questions: {},
  activity: [],
};

/** Local calendar day, "YYYY-MM-DD" (streaks follow the student's own midnight). */
export function dayKey(time: number | Date): string {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
