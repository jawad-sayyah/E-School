/*
 * Build-time prerendering (scripts/prerender.mjs): renders one URL of the app to static HTML,
 * so every page arrives with its content instead of an empty <div id="root">. The browser
 * then renders the same page with React (src/main.tsx) and takes over.
 * Built with `vite build --ssr src/entry-server.tsx`, run in Node, never shipped to browsers.
 */
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { domMax, LazyMotion, MotionConfig } from 'motion/react';
import { CLIENT_ONLY } from '@/components/ClientOnly';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getCourse, COURSES } from '@/content/courses';
import { getCourseLessons, getLessonMeta } from '@/content/lessons';
import { getTrack, TRACKS } from '@/content/tracks';
import { LocalProgressStore } from '@/progress/LocalProgressStore';
import { ProgressProvider } from '@/progress/ProgressContext';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { routes } from './routes';

const SITE = 'E School';
const DEFAULT_DESCRIPTION =
  'Learn JavaScript, React, TypeScript and testing with short lessons, runnable code, quizzes and exercises.';

export interface PrerenderedPage {
  html: string;
  title: string;
  description: string;
}

/** Every URL worth prerendering: the main pages, every track, course and lesson. */
export function prerenderUrls(): string[] {
  const urls = ['/', '/tracks', '/courses', '/project', '/reference', '/progress'];
  for (const track of TRACKS) urls.push(`/tracks/${track.id}`, `/certificates/${track.id}`);
  for (const course of COURSES) {
    urls.push(`/courses/${course.id}`);
    for (const lesson of getCourseLessons(course.id))
      urls.push(`/courses/${course.id}/${lesson.id}`);
  }
  return urls;
}

/** The same titles the pages set with useDocumentTitle, plus a description for search engines. */
function metaFor(url: string): { title: string; description: string } {
  const [, section, a, b] = url.split('/');
  const page = (title: string, description = DEFAULT_DESCRIPTION) => ({
    title: `${title} · ${SITE}`,
    description,
  });
  if (section === 'courses' && a && b) {
    const lesson = getLessonMeta(a, b);
    if (lesson) return page(`${lesson.title} · ${getCourse(a)?.title}`, lesson.summary);
  }
  if (section === 'courses' && a) {
    const course = getCourse(a);
    if (course) return page(course.title, course.description);
  }
  if (section === 'tracks' && a) {
    const track = getTrack(a);
    if (track) return page(`${track.title} track`, track.description);
  }
  if (section === 'certificates' && a) {
    const track = getTrack(a);
    if (track) return page(`${track.title} certificate`, track.tagline);
  }
  const fixed: Record<string, string> = {
    '': 'Learn JavaScript, React, TypeScript and testing',
    tracks: 'Tracks',
    courses: 'Courses',
    project: 'Build MiniShop',
    reference: 'JavaScript Quick Reference',
    progress: 'Your progress',
  };
  return page(fixed[section ?? ''] ?? 'Page not found');
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  let out = '';
  for await (const chunk of stream) out += typeof chunk === 'string' ? chunk : chunk.toString();
  return out;
}

export async function render(url: string): Promise<PrerenderedPage> {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(new URL(url, 'http://localhost')));
  if (context instanceof Response) throw new Error(`${url} answered with a redirect`);
  const router = createStaticRouter(handler.dataRoutes, context);

  // Any error while rendering fails the build: a page must never ship half-rendered.
  const errors: unknown[] = [];
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <ThemeProvider>
        <TooltipProvider delayDuration={400}>
          {/* A fresh, empty progress store: the HTML shows what a new visitor sees. */}
          <ProgressProvider store={new LocalProgressStore(null)}>
            <MotionConfig reducedMotion="user">
              <LazyMotion features={domMax} strict>
                <StaticRouterProvider router={router} context={context} hydrate={false} />
              </LazyMotion>
            </MotionConfig>
          </ProgressProvider>
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>,
    {
      onError: (error) => {
        if (error instanceof Error && error.message === CLIENT_ONLY) return;
        errors.push(error);
      },
    },
  );
  if (errors.length > 0) throw new Error(`Prerendering ${url} failed: ${String(errors[0])}`);
  return { html: await streamToString(prelude), ...metaFor(url) };
}
