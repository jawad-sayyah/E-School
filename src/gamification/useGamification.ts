import { useMemo } from 'react';
import { COURSES } from '@/content/courses';
import { getCourseLessons } from '@/content/lessons';
import { useProgress } from '@/progress/ProgressContext';
import { useToday } from '@/hooks/useToday';
import {
  badgeList,
  computeStreak,
  computeXp,
  levelFor,
  type BadgeContext,
  type CourseRef,
} from './rules';

/** Every course with the lessons that exist right now (for badges and track status). */
export const COURSE_REFS: CourseRef[] = COURSES.map((c) => ({
  id: c.id,
  title: c.title,
  lessons: getCourseLessons(c.id).map((l) => l.id),
}));

const BADGES = badgeList(COURSE_REFS);

/** XP, level, streak and badges, derived from the progress snapshot. */
export function useGamification() {
  const snapshot = useProgress();
  const today = useToday();
  return useMemo(() => {
    const xp = computeXp(snapshot);
    const streak = computeStreak(snapshot.activity, today);
    const ctx: BadgeContext = { snapshot, xp: xp.total, streak, courses: COURSE_REFS };
    const badges = BADGES.map((b) => ({ ...b, isEarned: b.earned(ctx) }));
    return { snapshot, xp, level: levelFor(xp.total), streak, badges };
  }, [snapshot, today]);
}
