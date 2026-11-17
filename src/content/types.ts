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

export interface CourseInfo {
  id: string;
  title: string;
  short: string;
  /** CSS variable name of the course color, e.g. "--js". */
  color: string;
  /** Text color to use on top of the course color. */
  onColor: 'dark' | 'light';
  badge: string;
  description: string;
  /** Phase in which the course is built; courses without lessons show "Coming soon". */
  lessons: string[];
}
