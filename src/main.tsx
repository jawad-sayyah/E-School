import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { LazyMotion, MotionConfig } from 'motion/react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProgressProvider } from '@/progress/ProgressContext';
import { LocalProgressStore } from '@/progress/LocalProgressStore';
import { getLessonMeta, lessonPromise } from '@/content/lessons';
import { allowEntranceAnimations } from '@/lib/entrance';
import { router } from './router';
import './index.css';

// Swap this for a Supabase-backed ProgressStore later; components don't change.
const progressStore = new LocalProgressStore();
const motionFeatures = () => import('@/lib/motionFeatures').then((mod) => mod.default);

/**
 * Pages are prerendered at build time (scripts/prerender.mjs). Before React replaces that
 * HTML, wait until the page can render completely: the route's code is loaded and, on a
 * lesson, so is the lesson. Otherwise the first render would flash a loading state.
 */
async function pageReady() {
  if (!router.state.initialized) {
    await new Promise<void>((resolve) => {
      const stop = router.subscribe((state) => {
        if (!state.initialized) return;
        stop();
        resolve();
      });
    });
  }
  const [, section, course, lesson] = window.location.pathname.split('/');
  const meta = section === 'courses' ? getLessonMeta(course, lesson) : undefined;
  if (meta) await lessonPromise(meta).catch(() => undefined);
}

const root = document.getElementById('root')!;
const prerendered = root.hasAttribute('data-prerendered');

const app = (
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={400}>
        <ProgressProvider store={progressStore}>
          <MotionConfig reducedMotion="user">
            <LazyMotion features={motionFeatures} strict>
              <RouterProvider router={router} />
            </LazyMotion>
          </MotionConfig>
        </ProgressProvider>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
);

void (prerendered ? pageReady() : Promise.resolve()).then(() => {
  // Hydrating keeps the prerendered nodes (no flash, and the page's largest paint stays early).
  if (prerendered) hydrateRoot(root, app);
  else createRoot(root).render(app);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // Content that appears from now on (after navigating) may animate in.
      allowEntranceAnimations();
      // The app is live (the e2e tests wait for this before clicking anything).
      document.documentElement.dataset.appReady = '';
    }),
  );
});
