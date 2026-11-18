import { Suspense, type ReactNode } from 'react';

/** Thrown on purpose while prerendering; entry-server.tsx doesn't count it as an error. */
export const CLIENT_ONLY = 'e-school:client-only';

function RenderInBrowser(): never {
  throw new Error(CLIENT_ONLY);
}

/**
 * For browser-only islands (Sandpack, Monaco). While prerendering (import.meta.env.SSR) the
 * content throws inside the Suspense boundary, so the HTML holds the fallback (the code, without
 * the editor) and React marks the boundary to be rendered in the browser. In the browser it's a
 * normal Suspense boundary around the lazy component, starting from the same fallback.
 */
export function ClientOnly({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <Suspense fallback={fallback}>{import.meta.env.SSR ? <RenderInBrowser /> : children}</Suspense>
  );
}
