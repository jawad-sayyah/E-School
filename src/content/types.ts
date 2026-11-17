/** Frontmatter of one lesson, plus where it lives. Generated at build time (virtual:lesson-meta). */
export interface LessonMeta {
  course: string;
  id: string;
  title: string;
  summary: string;
  minutes: number;
  tags: string[];
  /** A normal lesson, a course review, or a track's boss challenge. */
  kind: LessonKind;
  /** Vite glob key, e.g. "/src/content/courses/js-basics/01-variables.mdx" */
  file: string;
}

export type LessonKind = 'lesson' | 'review' | 'boss';

/** One searchable item: a whole lesson or a single concept inside it. */
export interface SearchDoc {
  id: string;
  kind: 'lesson' | 'concept';
  course: string;
  lesson: string;
  lessonTitle: string;
  title: string;
  /** Concept anchor id on the lesson page. */
  anchor?: string;
  tags: string;
  text: string;
  code: string;
}

export type CourseColor = 'js' | 'react' | 'ts' | 'testing' | 'mistakes';

export interface CourseInfo {
  id: string;
  title: string;
  /** Short label for the logo chip, e.g. "JS". */
  badge: string;
  color: CourseColor;
  description: string;
  /** Lesson ids in order. Must match the `id` in each lesson's frontmatter. */
  lessons: string[];
  /** Build phase (PROMPT.md §13). Courses with no lessons yet show "Coming in phase N". */
  phase: number;
}

/** Search docs from the JS Quick Reference use this as their course id (URL: /reference#id). */
export const REFERENCE_COURSE = 'reference';
export const REFERENCE_TITLE = 'JS Quick Reference';

export interface TrackInfo {
  id: string;
  title: string;
  badge: string;
  color: CourseColor;
  tagline: string;
  description: string;
  /** Course ids in order. */
  courses: string[];
  /** The boss challenge: a lesson that must be completed for the certificate. */
  boss?: { course: string; lesson: string };
  /** The "Build a real website" track, made of project steps instead of courses. */
  project?: boolean;
  /** Build phase in which the track becomes complete. */
  phase: number;
}
