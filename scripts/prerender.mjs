// Writes static HTML for every page after `vite build` (see "build" in package.json):
//   dist/index.html                      the home page
//   dist/courses/js-basics/variables.html one file per page (hosts serve it at the clean URL)
//   dist/app.html                         the empty app shell, for URLs that have no file (404s)
// The HTML comes from src/entry-server.tsx, built by `vite build --ssr` into dist-ssr/.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = path.resolve('dist');
const { render, prerenderUrls } = await import(
  pathToFileURL(path.resolve('dist-ssr/entry-server.js')).href
);

const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// Prerendered pages carry their CSS inline: no render-blocking request competing with the
// JavaScript downloads, so the page paints as soon as the HTML arrives.
const cssLink = /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/;
const cssHref = cssLink.exec(shell)?.[1];
if (!cssHref) throw new Error('dist/index.html links no stylesheet');
const css = fs.readFileSync(path.join(DIST, cssHref), 'utf8');
const inlined = shell.replace(cssLink, () => `<style>${css}</style>`);
if (!shell.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty root');
fs.writeFileSync(path.join(DIST, 'app.html'), shell);

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const started = Date.now();
const urls = prerenderUrls();
for (const url of urls) {
  const { html, title, description } = await render(url);
  const page = inlined
    .replace('<div id="root"></div>', () => `<div id="root" data-prerendered="">${html}</div>`)
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)}</title>`)
    .replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      (_m, before, after) => `${before}${escapeHtml(description)}${after}`,
    );
  const file =
    url === '/' ? path.join(DIST, 'index.html') : path.join(DIST, `${url.slice(1)}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page);
}
console.log(`Prerendered ${urls.length} pages in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
