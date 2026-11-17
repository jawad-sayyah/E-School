import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { RouteError } from '@/pages/RouteError';

/** Every page is its own chunk, loaded when its route is first visited. */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/pages/HomePage')).default }),
      },
      {
        path: 'courses',
        lazy: async () => ({ Component: (await import('@/pages/CoursesPage')).default }),
      },
      {
        path: 'courses/:course',
        lazy: async () => ({ Component: (await import('@/pages/CoursePage')).default }),
      },
      {
        path: 'courses/:course/:lesson',
        lazy: async () => ({ Component: (await import('@/pages/LessonPage')).default }),
      },
      {
        path: 'project/*',
        lazy: async () => ({ Component: (await import('@/pages/ComingSoonPage')).ProjectPage }),
      },
      {
        path: 'reference',
        lazy: async () => ({ Component: (await import('@/pages/ComingSoonPage')).ReferencePage }),
      },
      {
        path: 'progress',
        lazy: async () => ({ Component: (await import('@/pages/ProgressPage')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).default }),
      },
    ],
  },
]);
