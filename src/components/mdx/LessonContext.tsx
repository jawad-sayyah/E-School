import { createContext, use } from 'react';

export interface LessonRef {
  course: string;
  lesson: string;
}

export const LessonContext = createContext<LessonRef | null>(null);

/** The lesson a component is rendered in (used to build quiz / exercise progress keys). */
export function useLessonRef(): LessonRef {
  return use(LessonContext) ?? { course: 'reference', lesson: 'page' };
}
