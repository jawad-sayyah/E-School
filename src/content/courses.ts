import type { CourseInfo } from './types';

/**
 * The course manifest: order, colors and the ordered lesson ids of every course.
 * Courses are grouped into tracks in tracks.ts. A course's last lesson is its review quiz.
 * Courses with no lessons yet show "Coming in phase N".
 */
export const COURSES: CourseInfo[] = [
  // ── Track: JavaScript ─────────────────────────────────────────────
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
      'review',
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
      'review',
    ],
    phase: 2,
  },
  {
    id: 'js-depth',
    title: 'JavaScript in Depth',
    badge: 'JS',
    color: 'js',
    description:
      'Scope and hoisting, this, classes and prototypes, the event loop, Map and Set, generators, errors, regex, dates and modern syntax.',
    lessons: [
      'scope-hoisting',
      'this',
      'classes',
      'prototypes',
      'event-loop',
      'map-set',
      'generators',
      'errors',
      'regex',
      'dates-intl',
      'modern-syntax',
      'review',
      'boss',
    ],
    phase: 4,
  },

  // ── Track: TypeScript ─────────────────────────────────────────────
  {
    id: 'ts-basics',
    title: 'TypeScript Basics',
    badge: 'TS',
    color: 'ts',
    description:
      'Why TypeScript, types and inference, objects and interfaces, unions and narrowing, functions, tuples and enums.',
    lessons: [],
    phase: 8,
  },
  {
    id: 'ts-depth',
    title: 'TypeScript in Depth',
    badge: 'TS',
    color: 'ts',
    description:
      'Generics, keyof and typeof, utility types, type guards, discriminated unions, satisfies, tsconfig and declaration files.',
    lessons: [],
    phase: 8,
  },
  {
    id: 'ts-react',
    title: 'TypeScript with React',
    badge: 'TS',
    color: 'ts',
    description:
      'Typed props and children, state, events, refs, reducers, context, custom hooks and generic components.',
    lessons: [],
    phase: 8,
  },

  // ── Track: React ──────────────────────────────────────────────────
  {
    id: 'why-react',
    title: 'Why React?',
    badge: '⚛',
    color: 'react',
    description:
      'Build the cart in plain JavaScript, feel the pain of keeping the page in sync, then see how React makes the UI a function of state.',
    lessons: ['vanilla-cart', 'sync-pain', 'ui-from-state', 'before-after', 'review'],
    phase: 5,
  },
  {
    id: 'react',
    title: 'React Fundamentals',
    badge: '⚛',
    color: 'react',
    description:
      'Components, JSX, props, state, events, lists, conditional rendering, forms, lifting state up and composition.',
    lessons: [
      'components-jsx',
      'props',
      'state',
      'events',
      'lists-keys',
      'conditional',
      'forms',
      'lifting-state',
      'composition',
      'review',
    ],
    phase: 5,
  },
  {
    id: 'how-react-works',
    title: 'How React Works',
    badge: '⚛',
    color: 'react',
    description:
      'Rendering and reconciliation, memo, Suspense and lazy, error boundaries, portals, refs and StrictMode.',
    lessons: [
      'rendering',
      'memo',
      'suspense-lazy',
      'error-boundaries',
      'portals',
      'refs',
      'strict-mode',
      'review',
    ],
    phase: 5,
  },
  {
    id: 'hooks',
    title: 'React Hooks',
    badge: '⚛',
    color: 'react',
    description:
      'Every built-in hook, from useState to useSyncExternalStore, plus custom hooks and the Rules of Hooks.',
    lessons: [],
    phase: 6,
  },
  {
    id: 'react-19',
    title: 'React 19',
    badge: '⚛',
    color: 'react',
    description: 'Actions, use, useActionState, useOptimistic, useFormStatus and form actions.',
    lessons: [],
    phase: 6,
  },
  {
    id: 'react-ecosystem',
    title: 'The React Ecosystem',
    badge: '⚛',
    color: 'react',
    description:
      'React Router, TanStack Query, React Hook Form with Zod, Zustand and Redux Toolkit, accessibility and performance.',
    lessons: [],
    phase: 7,
  },
  {
    id: 'mistakes',
    title: 'Common React Mistakes',
    badge: '!',
    color: 'mistakes',
    description:
      'The mistakes every React beginner makes, each with the wrong code, the fix and why.',
    lessons: [],
    phase: 7,
  },
  {
    id: 'testing',
    title: 'Testing',
    badge: '✓',
    color: 'testing',
    description:
      'Test functions and React components the way real teams do: Vitest, Testing Library, mocking, MSW, jest-axe and Playwright.',
    lessons: [],
    phase: 9,
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

/** Tailwind text color for a course color. */
export const COURSE_TEXT: Record<CourseInfo['color'], string> = {
  js: 'text-js',
  react: 'text-react',
  ts: 'text-ts',
  testing: 'text-testing',
  mistakes: 'text-mistakes',
};
