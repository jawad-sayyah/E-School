import { Link } from 'react-router';
import { ArrowRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { COURSE_ACCENT, COURSE_CHIP } from '@/content/courses';
import { getCourseLessons } from '@/content/lessons';
import type { CourseInfo } from '@/content/types';
import { useProgress } from '@/progress/ProgressContext';
import { computeCourseProgress } from '@/progress/ProgressStore';
import { cn } from '@/lib/utils';

export function CourseChip({ course, className }: { course: CourseInfo; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold',
        COURSE_CHIP[course.color],
        className,
      )}
    >
      {course.badge}
    </span>
  );
}

/** A course on the home and courses pages, with its progress bar. */
export function CourseCard({ course, index }: { course: CourseInfo; index: number }) {
  const snapshot = useProgress();
  const lessons = getCourseLessons(course.id);
  const available = lessons.length > 0;
  const progress = computeCourseProgress(
    snapshot,
    course.id,
    lessons.map((l) => l.id),
  );

  return (
    <Card className={cn('relative gap-4 transition-colors', available && 'hover:border-faint')}>
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3">
          <CourseChip course={course} />
          <span className="text-xs font-medium text-faint">Course {index + 1}</span>
          {!available && (
            <Badge variant="outline" className="ml-auto text-faint">
              Coming in phase {course.phase}
            </Badge>
          )}
        </div>
        <CardTitle className="font-heading text-lg">
          {available ? (
            <Link
              to={`/courses/${course.id}`}
              className="after:absolute after:inset-0 after:rounded-xl"
            >
              {course.title}
            </Link>
          ) : (
            course.title
          )}
        </CardTitle>
        <CardDescription className="leading-relaxed">{course.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        {available ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress.completed} of {progress.total} lessons
              </span>
              <span>{progress.percent}%</span>
            </div>
            <Progress
              value={progress.percent}
              indicatorClassName={COURSE_ACCENT[course.color]}
              aria-label={`${course.title} progress`}
            />
          </div>
        ) : (
          <p className="text-xs text-faint">Lessons are on the way.</p>
        )}
      </CardContent>
      {available && (
        <CardFooter className="text-sm font-medium text-link">
          {progress.completed === 0
            ? 'Start course'
            : progress.percent === 100
              ? 'Review course'
              : 'Continue'}
          <ArrowRightIcon aria-hidden className="ml-1 size-4" />
        </CardFooter>
      )}
    </Card>
  );
}
