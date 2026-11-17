import type { CourseInfo } from './types';

/** The course manifest: order, colors and the ordered lesson ids of every course. */
export const COURSES: CourseInfo[] = [
  {
    id: 'js-basics',
    title: 'JavaScript Basics',
    badge: 'JS',
    color: 'js',
    description:
      'Variables, conditions, loops, functions, arrays, objects and strings: the JavaScript you need before React, taught with a shopping cart.',
    lessons: [
      'variables',
      'operators',
      'conditions',
      'loops',
      'functions',
      'callbacks-closures',
      'arrays-basics',
      'arrays-methods',
      'objects',
      'strings',
    ],
    phase: 1,
  },
  {
    id: 'modern-js',
    title: 'Modern JavaScript',
    badge: 'JS',
    color: 'js',
    description:
      'Spread and destructuring, promises, async/await, modules, the DOM, JSON and the gotchas that cause real bugs.',
    lessons: [
      'spread-rest',
      'timers-promises',
      'async-await',
      'modules',
      'dom-events',
      'json-storage',
      'gotchas',
    ],
    phase: 2,
  },
  {
    id: 'why-react',
    title: 'Why React?',
    badge: '⚛',
    color: 'react',
    description:
      'Build the cart in plain JavaScript, feel the pain of keeping the page in sync, then see how React makes the UI a function of state.',
    lessons: [],
    phase: 3,
  },
  {
    id: 'react',
    title: 'React',
    badge: '⚛',
    color: 'react',
    description: 'Components, JSX, props, state, events, lists, forms and lifting state up.',
    lessons: [],
    phase: 3,
  },
  {
    id: 'hooks',
    title: 'React Hooks',
    badge: '⚛',
    color: 'react',
    description:
      'useState in depth, useReducer, useEffect, useRef, useContext and your own useCart() hook.',
    lessons: [],
    phase: 3,
  },
  {
    id: 'typescript',
    title: 'TypeScript',
    badge: 'TS',
    color: 'ts',
    description:
      'Types, unions, narrowing, generics and typing React, with real type errors in the editor.',
    lessons: [],
    phase: 4,
  },
  {
    id: 'mistakes',
    title: 'Common React Mistakes',
    badge: '!',
    color: 'mistakes',
    description:
      'Eight mistakes every React beginner makes, each with the wrong code, the fix and why.',
    lessons: [],
    phase: 4,
  },
  {
    id: 'testing',
    title: 'Testing',
    badge: '✓',
    color: 'testing',
    description:
      'Test functions and React components the way real teams do: Vitest, Testing Library, mocking, MSW and Playwright.',
    lessons: [],
    phase: 5,
  },
];

export function getCourse(id: string | undefined): CourseInfo | undefined {
  return COURSES.find((c) => c.id === id);
}

/** Tailwind classes for a course's color chip (background + readable text). */
export const COURSE_CHIP: Record<CourseInfo['color'], string> = {
  js: 'bg-js text-on-light',
  react: 'bg-react text-on-light',
  ts: 'bg-ts text-on-dark',
  testing: 'bg-testing text-on-light',
  mistakes: 'bg-mistakes text-on-light',
};

/** Tailwind classes for a course-colored progress bar / accent line. */
export const COURSE_ACCENT: Record<CourseInfo['color'], string> = {
  js: 'bg-js',
  react: 'bg-react',
  ts: 'bg-ts',
  testing: 'bg-testing',
  mistakes: 'bg-mistakes',
};
