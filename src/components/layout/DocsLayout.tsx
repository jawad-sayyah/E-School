import { useState, type ReactNode } from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type { CourseInfo } from '@/content/types';
import { CourseSidebar } from './CourseSidebar';

interface DocsLayoutProps {
  course: CourseInfo;
  activeLesson?: string;
  /** Mobile bar label, e.g. "Lesson 3 of 10". */
  position?: string;
  toc?: ReactNode;
  children: ReactNode;
}

/** Three columns: lessons sidebar | content | "On this page". Sidebar is a drawer on mobile. */
export function DocsLayout({ course, activeLesson, position, toc, children }: DocsLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] toc:grid-cols-[260px_minmax(0,1fr)_220px]">
      <aside
        aria-label="Course navigation"
        className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-border bg-sidebar md:block"
      >
        <CourseSidebar
          course={course}
          activeLesson={activeLesson}
          className="h-full px-4 pt-6 pb-12"
        />
      </aside>

      <div className="min-w-0">
        <div className="sticky top-16 z-30 flex h-11 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open the lesson list"
          >
            <PanelLeftIcon aria-hidden />
            {course.title}
          </Button>
          {position && <span className="ml-auto text-xs text-faint">{position}</span>}
        </div>
        <main id="main" className="px-5 pt-8 pb-28 md:px-10 lg:px-14">
          {children}
        </main>
      </div>

      <aside aria-label="On this page" className="hidden toc:block">
        {toc}
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 bg-sidebar p-0">
          <SheetTitle className="sr-only">{course.title} lessons</SheetTitle>
          <SheetDescription className="sr-only">Pick a lesson</SheetDescription>
          <CourseSidebar
            course={course}
            activeLesson={activeLesson}
            onNavigate={() => setDrawerOpen(false)}
            className="h-full px-4 pt-6 pb-12"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
