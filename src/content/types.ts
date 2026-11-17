/** Frontmatter of one lesson, plus where it lives. Generated at build time (virtual:lesson-meta). */
export interface LessonMeta {
  course: string;
  id: string;
  title: string;
  summary: string;
  minutes: number;
  tags: string[];
  /** Vite glob key, e.g. "/src/content/courses/js-basics/01-variables.mdx" */
  file: string;
}

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
