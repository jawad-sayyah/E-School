import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';

/** Shown when a page crashes or a chunk fails to load (e.g. after a deploy). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <main id="main" className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-3 font-heading text-3xl font-bold">Something went wrong</h1>
      <p className="mb-2 text-muted-foreground">Reloading the page usually fixes this.</p>
      <p className="mb-8 font-mono text-sm text-faint">{message}</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Button variant="outline" asChild>
          <Link to="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
