import PACKAGES from './packages.json';

/*
 * npm packages available in React sandboxes. Every sandbox gets the `base` set; an
 * `optional` package is added when a file imports it, so lessons never list dependencies.
 * scripts/gen-react-tests.mjs reads the same JSON and rejects imports of unknown packages.
 */

export const BASE_PACKAGES: Record<string, string> = PACKAGES.base;
export const OPTIONAL_PACKAGES: Record<string, string> = PACKAGES.optional;

/** "react-dom/client" → "react-dom", "@tanstack/react-query" → itself. */
export function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Bare module specifiers imported by some code (not "./x" or "/x"). */
export function importedPackages(code: string): string[] {
  const found = new Set<string>();
  const rx = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"'./][^"']*)["']/g;
  for (const m of code.matchAll(rx)) found.add(packageName(m[1]));
  return [...found];
}

/** The dependencies for a sandbox with these files: the base set plus what they import. */
export function dependenciesFor(files: Record<string, string>): Record<string, string> {
  const deps = { ...BASE_PACKAGES };
  for (const code of Object.values(files)) {
    for (const name of importedPackages(code)) {
      if (OPTIONAL_PACKAGES[name]) deps[name] = OPTIONAL_PACKAGES[name];
    }
  }
  return deps;
}
