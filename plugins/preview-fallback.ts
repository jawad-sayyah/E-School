import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * `vite preview` behaves like the real hosts (vercel.json, netlify.toml): a prerendered page
 * is served from its .html file, and any other URL gets the empty app shell (dist/app.html),
 * not the prerendered home page, so the app can show its own 404.
 */
export function previewFallback(): Plugin {
  return {
    name: 'e-school:preview-fallback',
    configurePreviewServer(server) {
      const dist = path.resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const exists = (f: string) => fs.existsSync(path.join(dist, f));
        if (path.extname(file) === '' && !exists(file) && !exists(`${file}.html`)) {
          if (exists('app.html')) req.url = '/app.html';
        }
        next();
      });
    },
  };
}
