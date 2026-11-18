import type { Plugin } from 'vite';

/**
 * Fontsource declares its fonts with `font-display: swap`: on a slow connection the text first
 * shows in a system font, then reflows when the web font arrives (a layout shift, and a late
 * "largest paint"). `optional` uses the web font only if it's ready within ~100 ms, and from the
 * cache on every later visit, so the text never jumps.
 */
export function fontDisplayOptional(): Plugin {
  return {
    name: 'e-school:font-display-optional',
    apply: 'build',
    generateBundle(_options, bundle) {
      // Tailwind inlines the @fontsource imports, so rewrite the finished stylesheets.
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css')) {
          file.source = String(file.source).replaceAll(
            'font-display:swap',
            'font-display:optional',
          );
        }
      }
    },
  };
}
