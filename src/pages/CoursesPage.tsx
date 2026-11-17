import { CourseCard } from '@/components/CourseCard';
import { Crumbs } from '@/components/layout/Crumbs';
import { COURSES } from '@/content/courses';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function CoursesPage() {
  useDocumentTitle('Courses');
  return (
    <main id="main" className="mx-auto max-w-6xl px-5 pt-10 pb-24 md:px-8">
      <Crumbs items={[{ label: 'Courses' }]} />
      <h1 className="mb-3 font-heading text-4xl font-bold tracking-tight">All courses</h1>
      <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
        Take them in order: each course builds on the one before, and the shopping cart grows with
        you.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {COURSES.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} />
        ))}
      </div>
    </main>
  );
}
