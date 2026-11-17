import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <main id="main" className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-2 mb-3 font-heading text-3xl font-bold">This page doesn’t exist</h1>
      <p className="mb-8 text-muted-foreground">
        Maybe the link is old, or the lesson moved. Try search (press <Kbd>/</Kbd>) or go back to
        the courses.
      </p>
      <Button asChild>
        <Link to="/courses">Browse courses</Link>
      </Button>
    </main>
  );
}
