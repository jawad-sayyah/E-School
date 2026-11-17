import { Link } from 'react-router';
import { ArrowRightIcon, PlayIcon, ShoppingCartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CourseCard, CourseChip } from '@/components/CourseCard';
import { COURSES, getCourse } from '@/content/courses';
import { getLessonMeta } from '@/content/lessons';
import { useProgress } from '@/progress/ProgressContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

function ContinueCard() {
  const last = useProgress().lastVisited;
  const course = getCourse(last?.course);
  const lesson = getLessonMeta(last?.course, last?.lesson);
  if (!last || !course || !lesson) return null;
  return (
    <section aria-labelledby="continue-title" className="mb-14">
      <Card className="py-4">
        <CardContent className="flex flex-wrap items-center gap-4">
          <CourseChip course={course} />
          <div className="min-w-0 flex-1">
            <h2
              id="continue-title"
              className="text-xs font-semibold tracking-[0.08em] text-faint uppercase"
            >
              Continue where you left off
            </h2>
            <p className="font-heading text-lg font-semibold">{lesson.title}</p>
            <p className="text-sm text-muted-foreground">{course.title}</p>
          </div>
          <Button asChild>
            <Link to={`/courses/${course.id}/${lesson.id}`}>
              Continue
              <ArrowRightIcon aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HomePage() {
  useDocumentTitle('Learn JavaScript, React, TypeScript and testing');
  return (
    <main id="main" className="mx-auto max-w-6xl px-5 pt-14 pb-24 md:px-8">
      <section className="mb-14 max-w-3xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <ShoppingCartIcon aria-hidden className="size-3.5" />
          One shopping cart, from plain JavaScript to a tested React app
        </p>
        <h1 className="mb-5 font-heading text-4xl leading-[1.1] font-bold tracking-tight md:text-5xl">
          Get productive in <span className="text-js">JavaScript</span>,{' '}
          <span className="text-react">React</span>, <span className="text-ts">TypeScript</span> and{' '}
          <span className="text-testing">testing</span>.
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
          Short lessons, one idea at a time. Every concept comes with code you can edit and run
          right here, quizzes that check you understood, and exercises that test your code.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/courses/js-basics/variables">
              <PlayIcon aria-hidden className="fill-current" />
              Start with JavaScript Basics
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/courses">Browse all courses</Link>
          </Button>
        </div>
      </section>

      <ContinueCard />

      <section aria-labelledby="courses-title">
        <h2 id="courses-title" className="mb-5 font-heading text-2xl font-bold">
          Courses
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
