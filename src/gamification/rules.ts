import type { ProgressSnapshot } from '@/progress/ProgressStore';
import { lessonKey } from '@/progress/ProgressStore';

/*
 * Gamification is derived, never stored: XP, levels, streaks, badges and certificates
 * are computed from the raw progress facts, so the rules can change without migrations.
 */

export const XP_RULES = {
  lesson: 50,
  exercise: 40,
  questionFirstTry: 10,
  questionLater: 5,
  quizPoint: 5,
} as const;

export interface XpSummary {
  total: number;
  lessons: number;
  exercises: number;
  questions: number;
  quizzes: number;
}

export function computeXp(s: ProgressSnapshot): XpSummary {
  const lessons = Object.values(s.lessons).filter((l) => l.completed).length * XP_RULES.lesson;
  const exercises = Object.values(s.exercises).filter((e) => e.passed).length * XP_RULES.exercise;
  const questions = Object.values(s.questions).reduce(
    (sum, q) =>
      sum +
      (q.correct ? (q.attempts <= 1 ? XP_RULES.questionFirstTry : XP_RULES.questionLater) : 0),
    0,
  );
  const quizzes = Object.values(s.quizzes).reduce((sum, q) => sum + q.best * XP_RULES.quizPoint, 0);
  return {
    total: lessons + exercises + questions + quizzes,
    lessons,
    exercises,
    questions,
    quizzes,
  };
}

export interface LevelInfo {
  level: number;
  /** XP where this level starts and the next one starts. */
  floor: number;
  next: number;
  /** 0–1 progress through the current level. */
  progress: number;
}

/** Level n starts at 100 · n(n−1)/2 XP: 0, 100, 300, 600, 1000, 1500… */
export function levelFor(xp: number): LevelInfo {
  const start = (n: number) => (100 * n * (n - 1)) / 2;
  let level = 1;
  while (start(level + 1) <= xp) level++;
  const floor = start(level);
  const next = start(level + 1);
  return { level, floor, next, progress: (xp - floor) / (next - floor) };
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export interface StreakInfo {
  /** Consecutive days up to today (or yesterday, if today has no activity yet). */
  current: number;
  longest: number;
  activeToday: boolean;
}

export function computeStreak(days: string[], today: string): StreakInfo {
  const set = new Set(days.map(dayNumber));
  const t = dayNumber(today);
  const activeToday = set.has(t);
  let current = 0;
  for (let d = activeToday ? t : t - 1; set.has(d); d--) current++;

  let longest = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const d of [...set].sort((a, b) => a - b)) {
    run = d === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest, activeToday };
}

export interface CourseRef {
  id: string;
  title: string;
  lessons: string[];
}

export interface BadgeContext {
  snapshot: ProgressSnapshot;
  xp: number;
  streak: StreakInfo;
  courses: CourseRef[];
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  /** Icon name, mapped to a lucide icon in the UI. */
  icon:
    | 'footprints'
    | 'check'
    | 'puzzle'
    | 'cpu'
    | 'star'
    | 'bug'
    | 'eye'
    | 'brain'
    | 'flame'
    | 'calendar'
    | 'trophy'
    | 'graduation';
  earned: (ctx: BadgeContext) => boolean;
}

const correctOfKind = (s: ProgressSnapshot, kind: string, firstTry = false) =>
  Object.values(s.questions).filter(
    (q) => q.correct && q.kind === kind && (!firstTry || q.attempts <= 1),
  ).length;

const completedLessons = (s: ProgressSnapshot) =>
  Object.values(s.lessons).filter((l) => l.completed).length;

const passedExercises = (s: ProgressSnapshot) =>
  Object.values(s.exercises).filter((e) => e.passed).length;

export function courseComplete(s: ProgressSnapshot, course: CourseRef): boolean {
  return (
    course.lessons.length > 0 &&
    course.lessons.every((id) => s.lessons[lessonKey(course.id, id)]?.completed)
  );
}

/** Milestone badges, then one badge per completed course. */
export function badgeList(courses: CourseRef[]): Badge[] {
  const milestones: Badge[] = [
    {
      id: 'first-steps',
      title: 'First steps',
      description: 'Complete your first lesson.',
      icon: 'footprints',
      earned: ({ snapshot }) => completedLessons(snapshot) >= 1,
    },
    {
      id: 'it-works',
      title: 'It works!',
      description: 'Pass your first exercise.',
      icon: 'check',
      earned: ({ snapshot }) => passedExercises(snapshot) >= 1,
    },
    {
      id: 'problem-solver',
      title: 'Problem solver',
      description: 'Pass 10 exercises.',
      icon: 'puzzle',
      earned: ({ snapshot }) => passedExercises(snapshot) >= 10,
    },
    {
      id: 'code-machine',
      title: 'Code machine',
      description: 'Pass 30 exercises.',
      icon: 'cpu',
      earned: ({ snapshot }) => passedExercises(snapshot) >= 30,
    },
    {
      id: 'perfect-score',
      title: 'Perfect score',
      description: 'Get every question right in a quiz.',
      icon: 'star',
      earned: ({ snapshot }) => Object.values(snapshot.quizzes).some((q) => q.best === q.total),
    },
    {
      id: 'bug-hunter',
      title: 'Bug hunter',
      description: 'Spot 5 bugs.',
      icon: 'bug',
      earned: ({ snapshot }) => correctOfKind(snapshot, 'spot-bug') >= 5,
    },
    {
      id: 'fortune-teller',
      title: 'Fortune teller',
      description: 'Predict the output of 10 programs on the first try.',
      icon: 'eye',
      earned: ({ snapshot }) => correctOfKind(snapshot, 'predict', true) >= 10,
    },
    {
      id: 'curious-mind',
      title: 'Curious mind',
      description: 'Answer 50 questions correctly.',
      icon: 'brain',
      earned: ({ snapshot }) =>
        Object.values(snapshot.questions).filter((q) => q.correct).length >= 50,
    },
    {
      id: 'on-a-roll',
      title: 'On a roll',
      description: 'Learn 3 days in a row.',
      icon: 'flame',
      earned: ({ streak }) => streak.longest >= 3,
    },
    {
      id: 'week-warrior',
      title: 'Week warrior',
      description: 'Learn 7 days in a row.',
      icon: 'calendar',
      earned: ({ streak }) => streak.longest >= 7,
    },
    {
      id: 'rising-star',
      title: 'Rising star',
      description: 'Reach level 5.',
      icon: 'trophy',
      earned: ({ xp }) => levelFor(xp).level >= 5,
    },
  ];
  const perCourse: Badge[] = courses
    .filter((c) => c.lessons.length > 0)
    .map((course) => ({
      id: `course:${course.id}`,
      title: `${course.title} done`,
      description: `Complete every lesson in ${course.title}.`,
      icon: 'graduation',
      earned: ({ snapshot }) => courseComplete(snapshot, course),
    }));
  return [...milestones, ...perCourse];
}

export interface TrackRef {
  id: string;
  courses: string[];
  boss?: { course: string; lesson: string };
}

export interface TrackStatus {
  completedLessons: number;
  totalLessons: number;
  percent: number;
  bossPassed: boolean;
  /** Every course in the track has lessons (the track is fully built). */
  available: boolean;
  certified: boolean;
}

export function trackStatus(
  track: TrackRef,
  courses: CourseRef[],
  s: ProgressSnapshot,
): TrackStatus {
  const own = track.courses
    .map((id) => courses.find((c) => c.id === id))
    .filter((c): c is CourseRef => Boolean(c));
  const all = own.flatMap((c) => c.lessons.map((l) => lessonKey(c.id, l)));
  const done = all.filter((k) => s.lessons[k]?.completed).length;
  const available = own.length === track.courses.length && own.every((c) => c.lessons.length > 0);
  const bossPassed = track.boss
    ? Boolean(s.lessons[lessonKey(track.boss.course, track.boss.lesson)]?.completed)
    : true;
  return {
    completedLessons: done,
    totalLessons: all.length,
    percent: all.length ? Math.round((done / all.length) * 100) : 0,
    bossPassed,
    available,
    certified: available && done === all.length && bossPassed,
  };
}
