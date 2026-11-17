import type { TrackInfo } from './types';

/** Tracks group courses into learning paths. Each ends with a boss challenge and a certificate. */
export const TRACKS: TrackInfo[] = [
  {
    id: 'javascript',
    title: 'JavaScript',
    badge: 'JS',
    color: 'js',
    tagline: 'From your first variable to the event loop.',
    description:
      'Everything you need in JavaScript before React: the basics, modern syntax, async code, the DOM, and how the language really works underneath.',
    courses: ['js-basics', 'modern-js', 'js-depth'],
    boss: { course: 'js-depth', lesson: 'boss' },
    phase: 4,
  },
  {
    id: 'typescript',
    title: 'TypeScript',
    badge: 'TS',
    color: 'ts',
    tagline: 'Catch bugs before your users do.',
    description:
      'Types, inference, generics, utility types and type guards, then TypeScript in real React code.',
    courses: ['ts-basics', 'ts-depth', 'ts-react'],
    boss: { course: 'ts-react', lesson: 'boss' },
    phase: 8,
  },
  {
    id: 'react',
    title: 'React',
    badge: '⚛',
    color: 'react',
    tagline: 'Components, every hook, React 19 and testing.',
    description:
      'Why React exists, the fundamentals, every built-in hook, how React renders, React 19, the ecosystem, common mistakes and testing.',
    courses: [
      'why-react',
      'react',
      'how-react-works',
      'hooks',
      'react-19',
      'react-ecosystem',
      'mistakes',
      'testing',
    ],
    boss: { course: 'testing', lesson: 'boss' },
    phase: 5,
  },
  {
    id: 'website',
    title: 'Build a real website with React',
    badge: '🛒',
    color: 'testing',
    tagline: 'Grow MiniShop into a deployed, tested, multi-page site.',
    description:
      'Step by step, from a vanilla-JS cart to routing, product pages, checkout with validation, data fetching, state management, tests and deployment to Vercel.',
    courses: [],
    project: true,
    phase: 10,
  },
];

export function getTrack(id: string | undefined): TrackInfo | undefined {
  return TRACKS.find((t) => t.id === id);
}

/** The track a course belongs to. */
export function trackOfCourse(courseId: string): TrackInfo | undefined {
  return TRACKS.find((t) => t.courses.includes(courseId));
}
