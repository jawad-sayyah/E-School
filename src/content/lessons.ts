import type { MDXModule } from 'mdx/types';
import allLessons from 'virtual:lesson-meta';
import { COURSES, getCourse } from './courses';
import type { LessonMeta } from './types';

export interface LessonModule extends MDXModule {
  frontmatter?: Record<string, unknown>;
}

/** Lesson bodies load lazily, one chunk per lesson. */
const loaders = import.meta.glob<LessonModule>('/src/content/courses/*/*.mdx');

const byKey = new Map(allLessons.map((l) => [`${l.course}/${l.id}`, l]));

export function getLessonMeta(course: string | undefined, lesson: string | undefined) {
  return byKey.get(`${course}/${lesson}`);
}

/** The course's lessons in manifest order (only those that exist as files). */
export function getCourseLessons(courseId: string): LessonMeta[] {
  const course = getCourse(courseId);
  if (!course) return [];
  return course.lessons
    .map((id) => byKey.get(`${courseId}/${id}`))
    .filter((l): l is LessonMeta => Boolean(l));
}

export function getAdjacentLessons(courseId: string, lessonId: string) {
  const lessons = getCourseLessons(courseId);
  const index = lessons.findIndex((l) => l.id === lessonId);
  return {
    index,
    total: lessons.length,
    prev: index > 0 ? lessons[index - 1] : undefined,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
  };
}

export function loadLesson(meta: LessonMeta): Promise<LessonModule> {
  const load = loaders[meta.file];
  if (!load) return Promise.reject(new Error(`No lesson file for ${meta.file}`));
  return load();
}

/** Manifest ids that have no lesson file yet (used by a unit test to catch typos). */
export function findMissingLessons(): string[] {
  return COURSES.flatMap((c) =>
    c.lessons.filter((id) => !byKey.has(`${c.id}/${id}`)).map((id) => `${c.id}/${id}`),
  );
}

export const TOTAL_LESSONS = COURSES.reduce((n, c) => n + getCourseLessons(c.id).length, 0);
