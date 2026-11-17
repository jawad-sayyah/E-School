// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { EMPTY_PROGRESS, type ProgressSnapshot } from '@/progress/ProgressStore';
import {
  badgeList,
  computeStreak,
  computeXp,
  levelFor,
  trackStatus,
  XP_RULES,
  type BadgeContext,
} from './rules';

const snap = (patch: Partial<ProgressSnapshot>): ProgressSnapshot => ({
  ...EMPTY_PROGRESS,
  ...patch,
});
const q = (correct: boolean, attempts = 1, kind?: string) => ({
  correct,
  attempts,
  revealed: !correct,
  kind,
  at: 0,
});

describe('computeXp', () => {
  test('starts at 0', () => {
    expect(computeXp(EMPTY_PROGRESS).total).toBe(0);
  });

  test('adds up lessons, exercises, questions and quizzes', () => {
    const xp = computeXp(
      snap({
        lessons: { 'c/a': { completed: true }, 'c/b': { completed: false } },
        exercises: { 'c/a/e': { passed: true, at: 0 }, 'c/a/f': { passed: false, at: 0 } },
        questions: { q1: q(true, 1), q2: q(true, 3), q3: q(false, 2) },
        quizzes: { 'c/a': { best: 3, total: 4, at: 0 } },
      }),
    );
    expect(xp).toEqual({
      lessons: XP_RULES.lesson,
      exercises: XP_RULES.exercise,
      questions: XP_RULES.questionFirstTry + XP_RULES.questionLater,
      quizzes: 3 * XP_RULES.quizPoint,
      total: 50 + 40 + 15 + 15,
    });
  });
});

describe('levelFor', () => {
  test('levels start at 0, 100, 300, 600, 1000 XP', () => {
    expect(levelFor(0)).toMatchObject({ level: 1, floor: 0, next: 100, progress: 0 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100).level).toBe(2);
    expect(levelFor(450)).toMatchObject({ level: 3, floor: 300, next: 600, progress: 0.5 });
    expect(levelFor(1000).level).toBe(5);
  });
});

describe('computeStreak', () => {
  test('counts consecutive days up to today', () => {
    expect(computeStreak(['2026-11-15', '2026-11-16', '2026-11-17'], '2026-11-17')).toEqual({
      current: 3,
      longest: 3,
      activeToday: true,
    });
  });

  test('a streak is still alive if the last activity was yesterday', () => {
    expect(computeStreak(['2026-11-15', '2026-11-16'], '2026-11-17').current).toBe(2);
  });

  test('a missed day resets the current streak but keeps the longest', () => {
    const s = computeStreak(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10'], '2026-11-17');
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
  });

  test('works across month and year boundaries', () => {
    expect(computeStreak(['2026-12-31', '2027-01-01'], '2027-01-01').current).toBe(2);
    expect(computeStreak(['2026-02-28', '2026-03-01'], '2026-03-01').current).toBe(2);
  });

  test('no activity', () => {
    expect(computeStreak([], '2026-11-17')).toEqual({ current: 0, longest: 0, activeToday: false });
  });
});

describe('badges', () => {
  const courses = [
    { id: 'c', title: 'Course C', lessons: ['a', 'b'] },
    { id: 'empty', title: 'Empty', lessons: [] },
  ];
  const earnedIds = (patch: Partial<ProgressSnapshot>, extra: Partial<BadgeContext> = {}) => {
    const snapshot = snap(patch);
    const ctx: BadgeContext = {
      snapshot,
      xp: computeXp(snapshot).total,
      streak: computeStreak(snapshot.activity, '2026-11-17'),
      courses,
      ...extra,
    };
    return badgeList(courses)
      .filter((b) => b.earned(ctx))
      .map((b) => b.id);
  };

  test('nothing is earned at the start', () => {
    expect(earnedIds({})).toEqual([]);
  });

  test('milestones', () => {
    expect(earnedIds({ lessons: { 'c/a': { completed: true } } })).toEqual(['first-steps']);
    const bugs = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`b${i}`, q(true, 2, 'spot-bug')]),
    );
    expect(earnedIds({ questions: bugs })).toContain('bug-hunter');
    expect(earnedIds({ activity: ['2026-11-15', '2026-11-16', '2026-11-17'] })).toContain(
      'on-a-roll',
    );
    expect(earnedIds({ quizzes: { x: { best: 4, total: 4, at: 0 } } })).toContain('perfect-score');
  });

  test('a course badge needs every lesson; empty courses have no badge', () => {
    expect(
      earnedIds({ lessons: { 'c/a': { completed: true }, 'c/b': { completed: true } } }),
    ).toContain('course:c');
    expect(badgeList(courses).some((b) => b.id === 'course:empty')).toBe(false);
  });
});

describe('trackStatus', () => {
  const courses = [
    { id: 'one', title: 'One', lessons: ['a', 'boss'] },
    { id: 'two', title: 'Two', lessons: [] },
  ];

  test('a track with an unbuilt course is not available yet', () => {
    const s = trackStatus({ id: 't', courses: ['one', 'two'] }, courses, EMPTY_PROGRESS);
    expect(s.available).toBe(false);
    expect(s.certified).toBe(false);
  });

  test('certified when every lesson, including the boss, is complete', () => {
    const track = { id: 't', courses: ['one'], boss: { course: 'one', lesson: 'boss' } };
    const half = trackStatus(track, courses, snap({ lessons: { 'one/a': { completed: true } } }));
    expect(half).toMatchObject({ percent: 50, bossPassed: false, certified: false });
    const done = trackStatus(
      track,
      courses,
      snap({ lessons: { 'one/a': { completed: true }, 'one/boss': { completed: true } } }),
    );
    expect(done).toMatchObject({ percent: 100, bossPassed: true, certified: true });
  });
});
